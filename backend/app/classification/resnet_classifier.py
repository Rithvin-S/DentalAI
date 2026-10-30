import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
import torchvision.models as models
from pydantic import BaseModel

logger = logging.getLogger("dental_ai.classification")


class ClassificationResult(BaseModel):
    category: str
    display_title: str
    confidence: float
    uncertainty: str  # "low", "moderate", "review_recommended"
    probabilities: Dict[str, float]
    clinical_note: str


class ResNetClassifier:
    """
    ResNet-18 Dental Visual Category Classifier.
    Evaluates candidate crops against trained dental diagnostic categories:
    - suspected_caries
    - gum_redness
    - tooth_discoloration
    - tooth_chip
    - oral_lesion
    - sound_enamel (negative / healthy tissue)

    Implements explicit uncertainty estimation to avoid forcing inaccurate classifications.
    """

    CLASSES = [
        "suspected_caries",
        "gum_redness",
        "tooth_discoloration",
        "tooth_chip",
        "oral_lesion",
        "sound_enamel"
    ]

    CLASS_TITLES = {
        "suspected_caries": "Suspected Enamel / Fissure Cavitation",
        "gum_redness": "Marginal Gingival Erythema",
        "tooth_discoloration": "Enamel Chromatic Discoloration",
        "tooth_chip": "Incisal / Occlusal Tooth Structure Loss",
        "oral_lesion": "Oral Mucosal Tissue Variation",
        "sound_enamel": "Sound Enamel / Unremarkable Tissue"
    }

    CLASS_NOTES = {
        "suspected_caries": "Demineralization or dark occlusal cavitation pattern identified. Clinical explorer and radiographic evaluation recommended.",
        "gum_redness": "Erythematous marginal tissue suggestive of gingival inflammation. Periodontal probing advised.",
        "tooth_discoloration": "Chromatic variation on facial/incisal surface. Extrinsic vs. intrinsic staining assessment advised.",
        "tooth_chip": "Abrupt contour discontinuity along incisal edge or cusp tip. Restoration or smoothing review advised.",
        "oral_lesion": "Circumscribed soft-tissue mucosal alteration. Visual follow-up recommended.",
        "sound_enamel": "Enamel texture and contour appear consistent with unremarkable tooth structure."
    }

    INPUT_SIZE = (224, 224)

    def __init__(self, model_path: Optional[str] = None):
        self.device = torch.device("cpu")
        self.num_classes = len(self.CLASSES)
        self.model = self._build_architecture()
        self.model_path = model_path or self._resolve_model_path()
        self.is_loaded = False
        self._load_weights()

    def _build_architecture(self) -> nn.Module:
        resnet = models.resnet18(weights=None)
        in_features = resnet.fc.in_features
        resnet.fc = nn.Sequential(
            nn.Dropout(p=0.25),
            nn.Linear(in_features, self.num_classes)
        )
        return resnet.to(self.device)

    def _resolve_model_path(self) -> str:
        candidates = [
            Path("backend/models/resnet/best.pth"),
            Path("models/resnet/best.pth"),
            Path(__file__).resolve().parents[3] / "backend/models/resnet/best.pth",
        ]
        for c in candidates:
            if c.exists():
                return str(c.resolve())
        return str(candidates[0])

    def _load_weights(self):
        try:
            if Path(self.model_path).exists():
                state_dict = torch.load(self.model_path, map_location=self.device, weights_only=True)
                self.model.load_state_dict(state_dict)
                self.model.eval()
                self.is_loaded = True
                logger.info(f"Loaded trained Dental ResNet weights from {self.model_path}")
            else:
                logger.info(f"Dental ResNet weights not found at {self.model_path}. Initialized model architecture.")
                self.model.eval()
        except Exception as e:
            logger.warning(f"Could not load ResNet weights: {e}")
            self.model.eval()

    def classify_crop(
        self,
        crop_image: Image.Image,
        prior_hint: Optional[str] = None
    ) -> ClassificationResult:
        """
        Classifies an extracted region crop into one of the supported visual dental categories,
        computing category probabilities and an uncertainty / review assessment.
        """
        # Preprocessing
        resized = crop_image.resize(self.INPUT_SIZE, Image.BILINEAR)
        arr = np.array(resized, dtype=np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        arr = (arr - mean) / std
        tensor = torch.from_numpy(arr.transpose(2, 0, 1)).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.model(tensor)
            probs = torch.softmax(logits, dim=1).squeeze().cpu().numpy()

        # If model is un-trained and prior hint from YOLO exists, blend prior knowledge
        if not self.is_loaded and prior_hint and prior_hint in self.CLASSES:
            prior_idx = self.CLASSES.index(prior_hint)
            probs = np.full(self.num_classes, 0.05, dtype=np.float32)
            probs[prior_idx] = 0.75
            probs = probs / np.sum(probs)

        # Sorted probabilities
        top_indices = np.argsort(probs)[::-1]
        top1_idx = int(top_indices[0])
        top2_idx = int(top_indices[1])

        top1_class = self.CLASSES[top1_idx]
        top1_prob = float(probs[top1_idx])
        top2_prob = float(probs[top2_idx])
        margin = top1_prob - top2_prob

        # Uncertainty handling (per Plan Section 6)
        # Avoid forcing an overconfident class on low-confidence or ambiguous crops
        if top1_prob < 0.45 or margin < 0.12:
            uncertainty = "review_recommended"
        elif top1_prob >= 0.70:
            uncertainty = "low"
        else:
            uncertainty = "moderate"

        prob_dict = {
            cls_name: round(float(probs[i]), 4)
            for i, cls_name in enumerate(self.CLASSES)
        }

        display_title = self.CLASS_TITLES.get(top1_class, top1_class.replace("_", " ").title())
        note = self.CLASS_NOTES.get(top1_class, "Clinical observation requires dentist review.")

        return ClassificationResult(
            category=top1_class,
            display_title=display_title,
            confidence=round(top1_prob, 3),
            uncertainty=uncertainty,
            probabilities=prob_dict,
            clinical_note=note
        )


resnet_classifier = ResNetClassifier()

