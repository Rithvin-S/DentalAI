import os
import io
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from contextlib import asynccontextmanager

import torch
from PIL import Image, UnidentifiedImageError
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from ultralytics import YOLO

# Environment / Paths
BASE_DIR = Path(__file__).resolve().parent
DEFAULT_WEIGHTS = BASE_DIR / "runs" / "dental" / "baseline" / "weights" / "best.pt"
MODEL_WEIGHTS_PATH = Path(os.environ.get("OPENSOURCE_MODEL_PATH", str(DEFAULT_WEIGHTS)))

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB per image
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

STATIC_DISCLAIMER = (
    "EXPERIMENTAL PROTOTYPE ONLY: This open-source AI screening service provides automated preliminary visual "
    "observations and is NOT a medical diagnosis, diagnostic medical device, or treatment recommendation. "
    "Clinical examination and radiographs by a licensed dental professional are required."
)

# Global model container
model_instance: Optional[YOLO] = None
model_metadata: Dict[str, Any] = {
    "loaded": False,
    "path": str(MODEL_WEIGHTS_PATH),
    "device": "cpu",
    "classes": {},
    "load_time_seconds": 0.0
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Loads the fine-tuned open-source YOLO model once on service startup."""
    global model_instance, model_metadata
    start_time = time.time()
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    
    if MODEL_WEIGHTS_PATH.exists():
        try:
            model_instance = YOLO(str(MODEL_WEIGHTS_PATH))
            load_duration = round(time.time() - start_time, 3)
            model_metadata = {
                "loaded": True,
                "path": str(MODEL_WEIGHTS_PATH),
                "device": device,
                "classes": model_instance.names,
                "load_time_seconds": load_duration
            }
            print(f"[DentalAI Open-Source Service] Successfully loaded model from {MODEL_WEIGHTS_PATH} on {device} ({load_duration}s)")
        except Exception as err:
            print(f"[DentalAI Open-Source Service] Error loading model weights: {err}")
            model_instance = None
            model_metadata["loaded"] = False
            model_metadata["error"] = str(err)
    else:
        print(f"[DentalAI Open-Source Service] Warning: Weights not found at {MODEL_WEIGHTS_PATH}")
        model_instance = None
        model_metadata["loaded"] = False
        model_metadata["error"] = "Weights file not found"

    yield
    # Cleanup on shutdown if needed
    model_instance = None


app = FastAPI(
    title="Scanio.ai Open-Source Dental Inference Service",
    description="Stand-alone Python/FastAPI inference backend running open-source YOLOv8/11 dental caries and lesion detection.",
    version="2.0.0",
    lifespan=lifespan
)

# Configurable CORS for local development and Vercel production frontend
cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://dental-ai-frontend-six.vercel.app",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Response Models ---
class BoundingBoxCoordinates(BaseModel):
    ymin: float = Field(..., ge=0.0, le=1.0, description="Top edge (0-1 normalized)")
    xmin: float = Field(..., ge=0.0, le=1.0, description="Left edge (0-1 normalized)")
    ymax: float = Field(..., ge=0.0, le=1.0, description="Bottom edge (0-1 normalized)")
    xmax: float = Field(..., ge=0.0, le=1.0, description="Right edge (0-1 normalized)")


class DetectionItem(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    pixel_box: List[float] = Field(..., description="[x1, y1, x2, y2] in pixels")
    normalized_box: BoundingBoxCoordinates
    severity_category: str


class PredictResponse(BaseModel):
    status: str
    model: str
    view: Optional[str] = None
    image_width: int
    image_height: int
    count: int
    predictions: List[DetectionItem]
    inference_time_ms: float
    disclaimer: str


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    model_loaded: bool
    device: str
    weights_path: str
    target_classes: Dict[int, str]


CLASS_METADATA = {
    "suspected_caries": "review_recommended",
    "caries": "review_recommended",
    "cavity": "review_recommended",
    "gum_redness": "mild_concern",
    "tooth_discoloration": "mild_concern",
    "tooth_chip": "moderate_concern",
    "oral_lesion": "review_recommended",
    "other: crack": "moderate_concern"
}


def validate_image_bytes(file_bytes: bytes, filename: str) -> Image.Image:
    """Validates payload size, decodability, and minimum dimensions."""
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded file '{filename}' is empty (0 bytes)."
        )
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File '{filename}' exceeds maximum allowed size of 10 MB ({round(len(file_bytes)/(1024*1024), 2)} MB provided)."
        )
    
    ext = os.path.splitext(filename.lower())[1]
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file extension '{ext}'. Only JPEG, PNG, and WebP images are supported."
        )

    try:
        pil_img = Image.open(io.BytesIO(file_bytes))
        pil_img.verify()
        pil_img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded file '{filename}' is corrupt or cannot be decoded as an image."
        )

    width, height = pil_img.size
    if width < 100 or height < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image resolution too low ({width}x{height}). Minimum required resolution is 100x100."
        )

    return pil_img


def get_model() -> Optional[YOLO]:
    """Ensures model is loaded, allowing lazy load fallback for test harnesses."""
    global model_instance, model_metadata
    if model_instance is None and MODEL_WEIGHTS_PATH.exists():
        try:
            device = "cuda:0" if torch.cuda.is_available() else "cpu"
            model_instance = YOLO(str(MODEL_WEIGHTS_PATH))
            model_metadata = {
                "loaded": True,
                "path": str(MODEL_WEIGHTS_PATH),
                "device": device,
                "classes": model_instance.names,
                "load_time_seconds": 0.0
            }
        except Exception as e:
            model_instance = None
            model_metadata["loaded"] = False
            model_metadata["error"] = str(e)
    return model_instance


def run_yolo_detection(image: Image.Image, conf_threshold: float = 0.25) -> Tuple[List[DetectionItem], float]:
    """Runs verified YOLO model inference and formats actual predictions."""
    active_model = get_model()
    if active_model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Open-source model weights are unavailable or failed to initialize."
        )

    device = model_metadata.get("device", "cpu")
    t0 = time.time()
    
    try:
        results = active_model.predict(
            source=image,
            imgsz=640,
            conf=conf_threshold,
            device=device,
            verbose=False
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution failed: {str(exc)}"
        )

    elapsed_ms = round((time.time() - t0) * 1000.0, 2)
    detections: List[DetectionItem] = []

    for r in results:
        if r.boxes is None:
            continue
        for box in r.boxes:
            cls_id = int(box.cls.item())
            cls_name = active_model.names.get(cls_id, f"class_{cls_id}")
            confidence = float(box.conf.item())
            
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            xyxyn = box.xyxyn[0].tolist()
            
            # Clamp normalized coordinates to [0.0, 1.0]
            xmin = max(0.0, min(1.0, float(xyxyn[0])))
            ymin = max(0.0, min(1.0, float(xyxyn[1])))
            xmax = max(0.0, min(1.0, float(xyxyn[2])))
            ymax = max(0.0, min(1.0, float(xyxyn[3])))

            severity = CLASS_METADATA.get(cls_name, "review_recommended")

            detections.append(DetectionItem(
                class_id=cls_id,
                class_name=cls_name,
                confidence=round(confidence, 4),
                pixel_box=[round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
                normalized_box=BoundingBoxCoordinates(
                    ymin=round(ymin, 4),
                    xmin=round(xmin, 4),
                    ymax=round(ymax, 4),
                    xmax=round(xmax, 4)
                ),
                severity_category=severity
            ))

    return detections, elapsed_ms


# --- Endpoints ---
@app.get("/api/health", response_model=HealthResponse, tags=["Diagnostics"])
@app.get("/health", response_model=HealthResponse, tags=["Diagnostics"])
def health_check():
    """Diagnostic health check verifying service status and loaded model checkpoint."""
    get_model()
    return HealthResponse(
        status="ok" if model_metadata["loaded"] else "degraded",
        service="Scanio.ai Open-Source Dental Inference Service",
        version="2.0.0",
        model_loaded=model_metadata["loaded"],
        device=model_metadata.get("device", "cpu"),
        weights_path=model_metadata["path"],
        target_classes=model_metadata.get("classes", {})
    )


@app.post("/api/predict", response_model=PredictResponse, tags=["Inference"])
async def predict_single_image(
    file: UploadFile = File(..., description="Intraoral dental photograph (JPEG, PNG, WebP)"),
    conf: float = Form(0.25, description="Confidence detection threshold (0.05 to 0.95)"),
    view: Optional[str] = Form(None, description="Optional intraoral view label: front, upper, or lower")
):
    """
    Primary prediction endpoint for a single intraoral photograph.
    Returns detected classes, confidence scores, pixel coordinates, and normalized bounding boxes.
    """
    content = await file.read()
    pil_image = validate_image_bytes(content, file.filename or "uploaded_image.jpg")
    detections, inference_ms = run_yolo_detection(pil_image, conf_threshold=conf)

    return PredictResponse(
        status="success",
        model=f"Ultralytics YOLO (Trained Checkpoint: {MODEL_WEIGHTS_PATH.name})",
        view=view,
        image_width=pil_image.width,
        image_height=pil_image.height,
        count=len(detections),
        predictions=detections,
        inference_time_ms=inference_ms,
        disclaimer=STATIC_DISCLAIMER
    )


@app.post("/api/predict/multi-view", tags=["Inference"])
async def predict_multi_view(
    front: UploadFile = File(..., description="Front intraoral photograph"),
    upper: UploadFile = File(..., description="Upper maxillary intraoral photograph"),
    lower: UploadFile = File(..., description="Lower mandibular intraoral photograph"),
    conf: float = Form(0.25, description="Confidence threshold")
):
    """Scanio.ai 3-view protocol prediction endpoint."""
    front_img = validate_image_bytes(await front.read(), front.filename or "front.jpg")
    upper_img = validate_image_bytes(await upper.read(), upper.filename or "upper.jpg")
    lower_img = validate_image_bytes(await lower.read(), lower.filename or "lower.jpg")

    front_dets, front_ms = run_yolo_detection(front_img, conf)
    upper_dets, upper_ms = run_yolo_detection(upper_img, conf)
    lower_dets, lower_ms = run_yolo_detection(lower_img, conf)

    total_findings = len(front_dets) + len(upper_dets) + len(lower_dets)

    return {
        "status": "completed",
        "approach": "Approach B: Open-Source AI Model",
        "model": f"Ultralytics YOLO ({MODEL_WEIGHTS_PATH.name})",
        "total_findings": total_findings,
        "views": {
            "front": {
                "findings": [d.model_dump() for d in front_dets],
                "count": len(front_dets),
                "inference_ms": front_ms
            },
            "upper": {
                "findings": [d.model_dump() for d in upper_dets],
                "count": len(upper_dets),
                "inference_ms": upper_ms
            },
            "lower": {
                "findings": [d.model_dump() for d in lower_dets],
                "count": len(lower_dets),
                "inference_ms": lower_ms
            }
        },
        "summary": (
            f"Open-source YOLO model detected {total_findings} visible area(s) of interest "
            f"across front, upper, and lower intraoral photographs. Review by a licensed dentist is advised."
            if total_findings > 0
            else "No obvious visible dental surface abnormalities detected by the open-source YOLO model. This does not confirm oral health or rule out dental disease."
        ),
        "disclaimer": STATIC_DISCLAIMER
    }


# Backwards compatibility alias
@app.post("/analyze", tags=["Legacy Compatibility"])
async def analyze_legacy(
    front: UploadFile = File(...),
    upper: UploadFile = File(...),
    lower: UploadFile = File(...)
):
    return await predict_multi_view(front=front, upper=upper, lower=lower)
