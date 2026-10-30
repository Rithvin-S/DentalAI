from typing import Dict, List, Any
from app.schemas.screening import Finding, ViewAssessment, ScreeningStatus


class ReportGenerator:
    """
    Reporting and Cautious Clinical Summary Layer.
    Combines YOLO detections, U-Net masks, and ResNet classifications
    into non-diagnostic screening language emphasizing dentist consultation.
    """

    @staticmethod
    def generate_patient_triage(findings: List[Finding], status: ScreeningStatus) -> Dict[str, Any]:
        if status == ScreeningStatus.UNABLE_TO_ASSESS:
            return {
                "triage_level": "unassessable",
                "badge_color": "amber",
                "headline": "Photo Quality Insufficient for Evaluation",
                "action": "Please retake photographs with enhanced lighting and focused camera stability."
            }

        if len(findings) == 0:
            return {
                "triage_level": "routine_checkup",
                "badge_color": "emerald",
                "headline": "No Obvious Visual Findings Identified",
                "action": "Maintain daily oral hygiene and schedule routine 6-month dental checkups and diagnostic bitewing X-rays."
            }

        # Check for findings requiring review
        review_count = sum(1 for f in findings if f.severity in ["review_recommended", "moderate_concern"])
        if review_count > 0:
            return {
                "triage_level": "consultation_advised",
                "badge_color": "cyan",
                "headline": f"{len(findings)} Visual Area(s) Warranting Clinical Review",
                "action": "Schedule an in-person dental consultation for visual probing, transillumination, and radiographic correlation."
            }

        return {
            "triage_level": "routine_checkup",
            "badge_color": "emerald",
            "headline": "Minor Visual Variations Observed",
            "action": "Discuss observed areas with your dental hygienist or dentist during your next scheduled appointment."
        }

    @staticmethod
    def compile_model_breakdown(findings: List[Finding]) -> Dict[str, Any]:
        """Provides transparency on which model contributed to which observation."""
        breakdown = []
        for f in findings:
            breakdown.append({
                "finding_id": f.id,
                "view": f.view,
                "title": f.title,
                "yolo_localization": bool(f.localization),
                "confidence": f.confidence,
                "pipeline_stage": "OpenCV Preprocessing -> YOLOv8 Detection -> U-Net Segmentation -> ResNet Classification"
            })
        return {
            "total_observations": len(findings),
            "breakdown": breakdown,
            "architecture": "OpenCV • YOLOv8 • U-Net • ResNet"
        }


report_generator = ReportGenerator()

