import os
import uuid
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image
from pydantic import BaseModel

from app.core.config import settings
from app.utils.image_utils import denormalize_coords

logger = logging.getLogger("dental_ai.detection")


class YoloDetectionResult(BaseModel):
    id: str
    class_id: int
    class_name: str
    confidence: float
    ymin: float
    xmin: float
    ymax: float
    xmax: float
    pixel_coords: Tuple[int, int, int, int]  # (x1, y1, x2, y2)


class YoloDetector:
    """
    YOLOv8/11 Dental Landmark and Visual Finding Detector.
    Identifies candidate regions corresponding to suspected caries,
    marginal erythema, enamel discoloration, chips, and mucosal tissue patterns.
    """

    CLASS_NAMES = {
        0: "suspected_caries",
        1: "gum_redness",
        2: "tooth_discoloration",
        3: "tooth_chip",
        4: "oral_lesion"
    }

    def __init__(self, model_path: Optional[str] = None, conf_threshold: float = 0.25):
        self.conf_threshold = conf_threshold
        self.model = None
        self.model_path = model_path or self._resolve_model_path()
        self._load_model()

    def _resolve_model_path(self) -> str:
        candidates = [
            Path("backend/models/yolov8/best.pt"),
            Path("models/yolov8/best.pt"),
            Path(settings.YOLO_MODEL_PATH),
            Path(__file__).resolve().parents[3] / "backend/models/yolov8/best.pt",
            Path(__file__).resolve().parents[3] / settings.YOLO_MODEL_PATH,
        ]
        for c in candidates:
            if c.exists():
                return str(c.resolve())
        return str(candidates[0])

    def _load_model(self):
        try:
            if Path(self.model_path).exists():
                from ultralytics import YOLO
                self.model = YOLO(self.model_path)
                logger.info(f"Loaded YOLO detector from {self.model_path}")
            else:
                logger.warning(f"YOLO model weights not found at {self.model_path}")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            self.model = None

    def is_available(self) -> bool:
        return self.model is not None

    def detect(
        self,
        image: Image.Image,
        conf_threshold: Optional[float] = None
    ) -> List[YoloDetectionResult]:
        """
        Runs YOLO inference on a single intraoral PIL image.
        Returns a list of detected candidate bounding boxes with normalized coordinates.
        """
        if not self.is_available():
            logger.warning("YOLO detector called but model is not loaded.")
            return []

        conf = conf_threshold or self.conf_threshold
        w, h = image.size

        try:
            results = self.model.predict(
                source=image,
                conf=conf,
                imgsz=640,
                device="cpu",
                verbose=False
            )
        except Exception as e:
            logger.error(f"YOLO prediction error: {e}")
            return []

        detections: List[YoloDetectionResult] = []
        for r in results:
            if r.boxes is None:
                continue
            for box in r.boxes:
                cls_id = int(box.cls.item())
                cls_name = self.CLASS_NAMES.get(
                    cls_id,
                    self.model.names.get(cls_id, f"class_{cls_id}")
                )
                score = float(box.conf.item())

                # Normalized coords [xmin, ymin, xmax, ymax]
                xyxyn = box.xyxyn[0].tolist()
                xmin = max(0.0, min(1.0, float(xyxyn[0])))
                ymin = max(0.0, min(1.0, float(xyxyn[1])))
                xmax = max(0.0, min(1.0, float(xyxyn[2])))
                ymax = max(0.0, min(1.0, float(xyxyn[3])))

                pixel_coords = denormalize_coords(ymin, xmin, ymax, xmax, w, h)

                det = YoloDetectionResult(
                    id=str(uuid.uuid4())[:8],
                    class_id=cls_id,
                    class_name=cls_name,
                    confidence=round(score, 3),
                    ymin=round(ymin, 4),
                    xmin=round(xmin, 4),
                    ymax=round(ymax, 4),
                    xmax=round(xmax, 4),
                    pixel_coords=pixel_coords
                )
                detections.append(det)

        return detections


yolo_detector = YoloDetector()

