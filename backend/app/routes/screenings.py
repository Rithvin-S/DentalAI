import io
import os
import uuid
import time
import logging
from typing import Dict, Tuple, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, status
from fastapi.responses import JSONResponse
from PIL import Image

from app.core.config import settings
from app.schemas.screening import (
    ScreeningResponse,
    ScreeningStatus,
    ErrorResponse,
    ErrorDetail
)
from app.services.vision_model import vision_service

logger = logging.getLogger("dental_ai.screenings")
router = APIRouter()


def validate_single_image(
    file: UploadFile,
    content: bytes,
    field_name: str,
    request_id: str
) -> Tuple[bytes, str, Image.Image]:
    """
    Validates file size, extension, MIME type, and confirms it's a decodable image via PIL.
    """
    # 1. File size check (FR-05, AT-04)
    if len(content) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"{field_name}: File size exceeds maximum limit of 10 MB ({round(len(content) / (1024*1024), 2)} MB provided)."
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name}: Uploaded file is empty (0 bytes)."
        )

    # 2. Extension check
    filename = file.filename or ""
    _, ext = os.path.splitext(filename.lower())
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name}: Unsupported file extension '{ext}'. Only JPEG, PNG, and WebP are accepted."
        )

    # 3. MIME type check
    content_type = (file.content_type or "").lower()
    if content_type not in settings.ALLOWED_MIME_TYPES:
        # Fallback check based on extension if browser sent application/octet-stream
        mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
        if ext in mime_map:
            content_type = mime_map[ext]
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{field_name}: Unsupported MIME type '{content_type}'. Must be image/jpeg, image/png, or image/webp."
            )

    # 4. Decodability & integrity check using PIL (prevents corrupt files or spoofed headers)
    try:
        pil_image = Image.open(io.BytesIO(content))
        pil_image.verify()  # verify integrity
        # Re-open for actual processing since verify() closes or invalidates some streams
        pil_image = Image.open(io.BytesIO(content))
    except Exception as img_err:
        logger.warning(f"[{request_id}] Corrupt image uploaded for {field_name}: {str(img_err)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name}: The uploaded image file could not be decoded or is corrupted."
        )

    return content, content_type, pil_image


@router.post(
    "/analyze",
    response_model=ScreeningResponse,
    summary="Submit 3 intraoral photos for visual screening analysis"
)
async def analyze_screenings(
    front_image: UploadFile = File(..., description="Front view intraoral photograph (teeth and gums)"),
    upper_image: UploadFile = File(..., description="Upper view intraoral photograph (teeth and palate)"),
    lower_image: UploadFile = File(..., description="Lower view intraoral photograph (teeth and floor of mouth)"),
    consent_acknowledged: bool = Form(..., description="Must be true indicating explicit user acknowledgement"),
    detection_method: Optional[str] = Form("yolo", description="Detection method: 'yolo' (Method 1: Local Model) or 'gemini' (Method 2: Gemini API)"),
    scenario: Optional[str] = Query(None, description="Optional simulation scenario: 'default', 'clean', or 'unassessable'")
):
    request_id = str(uuid.uuid4())
    start_time = time.time()
    logger.info(f"[{request_id}] Received screening analysis request (method: {detection_method})")

    # 1. Enforce Informed Consent (FR-08, AT-06)
    if not consent_acknowledged:
        logger.warning(f"[{request_id}] Rejected: Consent acknowledgement missing or false")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informed consent and privacy notice acknowledgement is mandatory prior to visual analysis."
        )

    # 2. Read contents asynchronously into memory (transient; no disk storage per FR-17)
    try:
        front_bytes = await front_image.read()
        upper_bytes = await upper_image.read()
        lower_bytes = await lower_image.read()
    except Exception as read_err:
        logger.error(f"[{request_id}] Error reading multipart files: {str(read_err)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded image files. Please verify connection and try again."
        )

    # 3. Validate each of the three mandatory views
    validated_images: Dict[str, Tuple[bytes, str, Image.Image]] = {}
    
    validated_images["front"] = validate_single_image(front_image, front_bytes, "Front View (front_image)", request_id)
    validated_images["upper"] = validate_single_image(upper_image, upper_bytes, "Upper View (upper_image)", request_id)
    validated_images["lower"] = validate_single_image(lower_image, lower_bytes, "Lower View (lower_image)", request_id)

    # 4. Invoke vision model service with requested detection method
    try:
        response = await vision_service.analyze_photos(
            images=validated_images,
            request_id=request_id,
            test_scenario=scenario,
            detection_method=detection_method
        )
        duration = round(time.time() - start_time, 2)
        logger.info(f"[{request_id}] Screening analysis completed successfully in {duration}s using {response.model_name}. Status={response.status}")
        return response
    except Exception as err:
        logger.error(f"[{request_id}] Unexpected processing failure: {type(err).__name__} - {str(err)}")
        # Safe error without leaking stack traces or keys (FR-16, NFR-09)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing the visual screening. Please try again later."
        )


@router.get("/config-info")
async def get_config_info():
    """
    Returns non-sensitive public configuration for client initialization, including available AI detection methods.
    """
    active_provider = vision_service._resolve_provider()
    return {
        "project": settings.PROJECT_NAME,
        "max_file_size_bytes": settings.MAX_FILE_SIZE_BYTES,
        "max_file_size_mb": int(settings.MAX_FILE_SIZE_BYTES / (1024 * 1024)),
        "allowed_extensions": list(settings.ALLOWED_EXTENSIONS),
        "allowed_mime_types": list(settings.ALLOWED_MIME_TYPES),
        "ai_provider": active_provider,
        "available_methods": vision_service.get_available_methods(),
        "has_yolo": vision_service.yolo_model is not None,
        "has_gemini": bool(vision_service.gemini_key or settings.GEMINI_API_KEY),
        "gemini_model": settings.GEMINI_MODEL,
        "version": "1.1.0"
    }
