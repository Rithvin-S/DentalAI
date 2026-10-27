from enum import Enum
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class ViewType(str, Enum):
    FRONT = "front"
    UPPER = "upper"
    LOWER = "lower"


class ScreeningStatus(str, Enum):
    COMPLETED = "completed"
    UNABLE_TO_ASSESS = "unable_to_assess"
    FAILED = "failed"


class BoundingBox(BaseModel):
    # Normalized coordinates 0.0 to 1.0 (relative to original image dimensions)
    ymin: float = Field(..., ge=0.0, le=1.0, description="Top bound normalized (0 to 1)")
    xmin: float = Field(..., ge=0.0, le=1.0, description="Left bound normalized (0 to 1)")
    ymax: float = Field(..., ge=0.0, le=1.0, description="Bottom bound normalized (0 to 1)")
    xmax: float = Field(..., ge=0.0, le=1.0, description="Right bound normalized (0 to 1)")


class Finding(BaseModel):
    id: str
    view: ViewType
    label: str = Field(..., description="Machine-readable label e.g. possible_visible_discoloration")
    title: str = Field(..., description="Human-readable cautious title")
    description: str = Field(..., description="Non-diagnostic observational summary")
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Model confidence score if defined; non-clinical")
    severity: Optional[str] = Field(None, description="Observation priority: mild_concern, moderate_concern, review_recommended")
    localization: Optional[BoundingBox] = Field(None, description="Normalized coordinates on the original image; null if not localized")


class ViewAssessment(BaseModel):
    view: ViewType
    status: str = Field("assessed", description="'assessed', 'unable_to_assess', or 'poor_quality'")
    quality_note: Optional[str] = None
    findings_count: int = 0


class ScreeningResponse(BaseModel):
    request_id: str
    status: ScreeningStatus
    summary: str
    findings: List[Finding] = []
    view_assessments: Dict[str, ViewAssessment]
    limitations: List[str]
    emergency_notice: str
    disclaimer: str
    timestamp: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    field: Optional[str] = None


class ErrorResponse(BaseModel):
    request_id: str
    status: str = "failed"
    errors: List[ErrorDetail]
