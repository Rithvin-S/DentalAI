import time
import uuid
import logging
from typing import Dict, List, Tuple, Any, Optional
from PIL import Image
from pydantic import BaseModel

from app.preprocessing.image_processor import image_processor
from app.detection.yolo_detector import yolo_detector, YoloDetectionResult
from app.segmentation.unet_segmenter import unet_segmenter, SegmentationResult
from app.classification.resnet_classifier import resnet_classifier, ClassificationResult
from app.utils.image_utils import crop_region_with_padding
from app.schemas.screening import (
    ScreeningResponse,
    ScreeningStatus,
    Finding,
    BoundingBox,
    ViewType,
    ViewAssessment
)

logger = logging.getLogger("dental_ai.pipeline")

STATIC_LIMITATIONS = [
    "Multi-model AI visual screening is an experimental triage aid, NOT a definitive diagnosis or dental treatment plan.",
    "Ordinary photographs cannot evaluate subsurface decay, hidden interproximal contact decay, pulp vitality, or periodontal bone loss.",
    "Lighting artifacts, camera shadows, and saliva reflections can influence localized pixel segmentation and classification confidence.",
    "An absence of detected abnormalities does NOT verify oral health. Clinical evaluation and diagnostic radiographs by a licensed dentist are essential."
]

STATIC_EMERGENCY_NOTICE = (
    "URGENT WARNING: If you are experiencing facial/jaw swelling, difficulty breathing or swallowing, "
    "fever associated with severe dental pain, or traumatic injury, seek immediate emergency medical care."
)

STATIC_DISCLAIMER = (
    "DentalAI operates strictly as an image-based visual screening tool. Under no circumstances should this "
    "replace professional dental consultation, clinical probing, or radiographic diagnostic imaging."
)


class MultiModelFinding(BaseModel):
    id: str
    view: str
    yolo_detection: YoloDetectionResult
    unet_segmentation: SegmentationResult
    resnet_classification: ClassificationResult
    opencv_metadata: Dict[str, Any]


class DentalPipeline:
    """
    Coordinated Dental Screening Pipeline retaining all four technologies:
    1. OpenCV: Image validation, colour-safe contrast enhancement (CLAHE on L-channel), noise reduction.
    2. YOLOv8: Locates tooth structures and candidate findings with bounding boxes.
    3. U-Net: Generates pixel-level segmentation masks for localized structures.
    4. ResNet: Classifies candidate regions into dental diagnostic categories with uncertainty detection.
    """

    def __init__(self):
        self.preprocessor = image_processor
        self.detector = yolo_detector
        self.segmenter = unet_segmenter
        self.classifier = resnet_classifier

    def analyze_single_view(
        self,
        image: Image.Image,
        view_name: str
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Processes one intraoral view end-to-end through the 4-stage pipeline.
        Returns (list_of_combined_findings, quality_metadata).
        """
        # Step 1: OpenCV Preprocessing
        cv_preprocessed, pil_preprocessed, cv_meta = self.preprocessor.preprocess(image)

        # Step 2: YOLOv8 Localization
        detections = self.detector.detect(pil_preprocessed)

        findings_data: List[Dict[str, Any]] = []
        full_w, full_h = image.size

        # Step 3: For each detected region, run U-Net Segmentation & ResNet Classification
        for det in detections:
            # Crop region with contextual margin
            crop_img, crop_origin = crop_region_with_padding(
                image=image,
                ymin=det.ymin,
                xmin=det.xmin,
                ymax=det.ymax,
                xmax=det.xmax,
                padding=0.08
            )

            # Step 3A: U-Net Pixel Segmentation
            seg_result = self.segmenter.segment_crop(
                crop_image=crop_img,
                crop_origin=crop_origin,
                full_image_size=(full_w, full_h),
                finding_class=det.class_name
            )

            # Step 3B: ResNet Category Classification
            cls_result = self.classifier.classify_crop(
                crop_image=crop_img,
                prior_hint=det.class_name
            )

            finding_dict = {
                "id": det.id,
                "view": view_name,
                "yolo": det.model_dump(),
                "unet": seg_result.model_dump(),
                "resnet": cls_result.model_dump(),
                "opencv": {
                    "brightness": cv_meta.get("brightness"),
                    "contrast": cv_meta.get("contrast"),
                    "sharpness": cv_meta.get("sharpness")
                }
            }
            findings_data.append(finding_dict)

        return findings_data, cv_meta

    def run_multi_view_pipeline(
        self,
        images: Dict[str, Tuple[bytes, str, Image.Image]],
        request_id: str
    ) -> ScreeningResponse:
        """
        Executes the coordinated multi-model pipeline across Front, Upper, and Lower views.
        Builds a comprehensive ScreeningResponse enriched with bounding boxes, segmentation masks,
        and ResNet classifications.
        """
        all_findings: List[Finding] = []
        view_assessments: Dict[str, ViewAssessment] = {}
        poor_quality_views = []

        for view_name in ["front", "upper", "lower"]:
            if view_name not in images:
                continue

            _, _, pil_img = images[view_name]
            view_findings_raw, cv_meta = self.analyze_single_view(pil_img, view_name)

            if cv_meta.get("status") == "poor_quality":
                poor_quality_views.append(view_name)

            view_assessments[view_name] = ViewAssessment(
                view=ViewType(view_name),
                status=cv_meta.get("status", "assessed"),
                quality_note=cv_meta.get("quality_note", "Adequate view quality"),
                findings_count=len(view_findings_raw)
            )

            for f_data in view_findings_raw:
                det = f_data["yolo"]
                seg = f_data["unet"]
                cls = f_data["resnet"]

                # Determine label & title
                label_map = {
                    "suspected_caries": "possible_surface_irregularity",
                    "gum_redness": "possible_visible_gingival_redness",
                    "tooth_discoloration": "possible_visible_discoloration",
                    "tooth_chip": "possible_surface_irregularity",
                    "oral_lesion": "unusual_tissue_appearance",
                    "sound_enamel": "unremarkable_tissue"
                }

                category = cls["category"]
                label = label_map.get(category, "possible_visible_observation")
                title = cls["display_title"]

                # Synthesize multi-model non-diagnostic description
                uncertainty_text = (
                    " [Uncertainty Flag: Borderline visual appearance — direct clinical inspection recommended]"
                    if cls["uncertainty"] == "review_recommended" else ""
                )
                desc = (
                    f"Visual observation localized by YOLOv8 (conf {det['confidence']:.2f}), "
                    f"segmented by U-Net ({seg['coverage_percent']:.2f}% view coverage, Dice {seg['dice_score']:.2f}), "
                    f"and categorized by ResNet as '{title}' ({cls['confidence']:.2f} confidence).{uncertainty_text}"
                )

                severity = "review_recommended"
                if category in ["tooth_discoloration", "sound_enamel"]:
                    severity = "mild_concern"
                elif category in ["gum_redness", "tooth_chip"]:
                    severity = "moderate_concern"

                finding = Finding(
                    id=f_data["id"],
                    view=ViewType(view_name),
                    label=label,
                    title=title,
                    description=desc,
                    confidence=round(det["confidence"], 3),
                    severity=severity,
                    localization=BoundingBox(
                        ymin=det["ymin"],
                        xmin=det["xmin"],
                        ymax=det["ymax"],
                        xmax=det["xmax"]
                    )
                )

                # Attach segmentation & classification payload in extra fields
                # (Pydantic v2 allows extra fields if schema is updated or set as dict)
                finding_dict = finding.model_dump()
                finding_dict["segmentation"] = seg
                finding_dict["classification"] = cls
                finding_dict["models_used"] = "OpenCV + YOLOv8 + U-Net + ResNet"

                all_findings.append(Finding(**finding_dict))

        # Check unassessable threshold
        if len(poor_quality_views) >= 2:
            status = ScreeningStatus.UNABLE_TO_ASSESS
            summary = (
                "Visual screening could not be completed reliably due to suboptimal image quality "
                "(insufficient lighting or blur) in submitted photographs."
            )
        elif len(all_findings) > 0:
            status = ScreeningStatus.COMPLETED
            summary = (
                f"Multi-Model Dental AI Pipeline (OpenCV • YOLOv8 • U-Net • ResNet) analyzed 3 intraoral views "
                f"and identified {len(all_findings)} localized visual area(s) of interest. "
                f"All observations are screening suggestions requiring clinical evaluation by a licensed dentist."
            )
        else:
            status = ScreeningStatus.COMPLETED
            summary = (
                "Multi-Model Dental AI Pipeline identified no prominent surface abnormalities across front, upper, "
                "and lower views. A clean visual screening does not guarantee absence of hidden caries or periodontal disease."
            )

        return ScreeningResponse(
            request_id=request_id,
            status=status,
            summary=summary,
            findings=all_findings,
            view_assessments=view_assessments,
            limitations=STATIC_LIMITATIONS,
            emergency_notice=STATIC_EMERGENCY_NOTICE,
            disclaimer=STATIC_DISCLAIMER,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            detection_method="multi_model",
            model_name="Method 3: Multi-Model AI Ensemble (OpenCV • YOLOv8 • U-Net • ResNet)"
        )


dental_pipeline = DentalPipeline()

