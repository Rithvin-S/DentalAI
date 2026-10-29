import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.core.config import settings

client = TestClient(app)


def create_dummy_image(format="JPEG", size=(300, 300), color=(200, 150, 150)):
    """Helper to generate a valid in-memory test image"""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    buf.seek(0)
    return buf.getvalue()


def test_health_check():
    """Verify healthcheck endpoint"""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_config_info():
    """Verify public config endpoint and available detection methods"""
    response = client.get("/api/screenings/config-info")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "DentalAI"
    assert data["max_file_size_mb"] == 10
    assert "available_methods" in data
    assert len(data["available_methods"]) >= 2
    method_ids = [m["id"] for m in data["available_methods"]]
    assert "yolo" in method_ids
    assert "gemini" in method_ids
    assert data["has_gemini"] is True


def test_at_01_upload_all_three_valid_images():
    """AT-01: Upload all three valid images -> 200 completed with structured findings"""
    front_bytes = create_dummy_image("JPEG", color=(220, 180, 180))
    upper_bytes = create_dummy_image("PNG", color=(200, 160, 160))
    lower_bytes = create_dummy_image("JPEG", color=(210, 170, 170))

    files = {
        "front_image": ("front.jpg", front_bytes, "image/jpeg"),
        "upper_image": ("upper.png", upper_bytes, "image/png"),
        "lower_image": ("lower.jpg", lower_bytes, "image/jpeg")
    }
    data = {"consent_acknowledged": "true"}

    response = client.post("/api/screenings/analyze", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert res["status"] in ["completed", "unable_to_assess"]
    assert "request_id" in res
    assert "limitations" in res
    assert len(res["limitations"]) > 0
    assert "findings" in res
    # Verify localization coordinates are normalized (0.0 to 1.0)
    for f in res["findings"]:
        if f.get("localization"):
            loc = f["localization"]
            assert 0.0 <= loc["ymin"] < loc["ymax"] <= 1.0
            assert 0.0 <= loc["xmin"] < loc["xmax"] <= 1.0


def test_at_02_leave_one_view_empty():
    """AT-02: Leave one view empty -> 422 Unprocessable Entity"""
    front_bytes = create_dummy_image()
    upper_bytes = create_dummy_image()

    files = {
        "front_image": ("front.jpg", front_bytes, "image/jpeg"),
        "upper_image": ("upper.jpg", upper_bytes, "image/jpeg")
        # lower_image missing
    }
    data = {"consent_acknowledged": "true"}

    response = client.post("/api/screenings/analyze", files=files, data=data)
    assert response.status_code == 422


def test_at_03_upload_unsupported_file_type():
    """AT-03: Upload unsupported file type (e.g. text or pdf) -> rejected"""
    front_bytes = create_dummy_image()
    upper_bytes = create_dummy_image()
    invalid_bytes = b"%PDF-1.4 Fake PDF file content"

    files = {
        "front_image": ("front.jpg", front_bytes, "image/jpeg"),
        "upper_image": ("upper.jpg", upper_bytes, "image/jpeg"),
        "lower_image": ("document.pdf", invalid_bytes, "application/pdf")
    }
    data = {"consent_acknowledged": "true"}

    response = client.post("/api/screenings/analyze", files=files, data=data)
    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]


def test_at_04_oversized_file():
    """AT-04: File exceeding 10MB -> 413 Payload Too Large"""
    oversized = b"0" * (10 * 1024 * 1024 + 1024)  # 10MB + 1KB
    valid_bytes = create_dummy_image()

    files = {
        "front_image": ("front.jpg", oversized, "image/jpeg"),
        "upper_image": ("upper.jpg", valid_bytes, "image/jpeg"),
        "lower_image": ("lower.jpg", valid_bytes, "image/jpeg")
    }
    data = {"consent_acknowledged": "true"}

    response = client.post("/api/screenings/analyze", files=files, data=data)
    assert response.status_code == 413


def test_at_06_submit_without_consent():
    """AT-06: Consent false or missing -> 400 Bad Request without calling model"""
    valid_bytes = create_dummy_image()
    files = {
        "front_image": ("front.jpg", valid_bytes, "image/jpeg"),
        "upper_image": ("upper.jpg", valid_bytes, "image/jpeg"),
        "lower_image": ("lower.jpg", valid_bytes, "image/jpeg")
    }
    data = {"consent_acknowledged": "false"}

    response = client.post("/api/screenings/analyze", files=files, data=data)
    assert response.status_code == 400
    assert "consent" in response.json()["detail"].lower()


def test_at_11_no_visible_finding_scenario():
    """AT-11: Clean scenario returns cautious non-diagnostic language, no healthy claim"""
    valid_bytes = create_dummy_image()
    files = {
        "front_image": ("front.jpg", valid_bytes, "image/jpeg"),
        "upper_image": ("upper.jpg", valid_bytes, "image/jpeg"),
        "lower_image": ("lower.jpg", valid_bytes, "image/jpeg")
    }
    data = {"consent_acknowledged": "true"}

    response = client.post("/api/screenings/analyze?scenario=clean", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert len(res["findings"]) == 0
    assert "No obvious visible abnormalities detected" in res["summary"]
    # Verify it does NOT claim "healthy" or rule out disease
    assert "healthy" not in res["summary"].lower() or "does not" in res["summary"].lower()


def test_yolo_model_inference_with_samples():
    """Verify end-to-end inference with fine-tuned YOLO model using sample photos"""
    import os
    sample_dir = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "samples")
    front_path = os.path.join(sample_dir, "front_sample.jpg")
    upper_path = os.path.join(sample_dir, "upper_sample.jpg")
    lower_path = os.path.join(sample_dir, "lower_sample.jpg")

    if not (os.path.exists(front_path) and os.path.exists(upper_path) and os.path.exists(lower_path)):
        pytest.skip("Sample images not found")

    with open(front_path, "rb") as f_front, open(upper_path, "rb") as f_upper, open(lower_path, "rb") as f_lower:
        files = {
            "front_image": ("front.jpg", f_front.read(), "image/jpeg"),
            "upper_image": ("upper.jpg", f_upper.read(), "image/jpeg"),
            "lower_image": ("lower.jpg", f_lower.read(), "image/jpeg")
        }

    data = {"consent_acknowledged": "true"}
    response = client.post("/api/screenings/analyze", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "completed"
    assert "findings" in res
    assert len(res["findings"]) > 0
    # Check that findings have valid bounding boxes
    for finding in res["findings"]:
        assert finding["localization"] is not None
        loc = finding["localization"]
        assert 0.0 <= loc["ymin"] <= loc["ymax"] <= 1.0
        assert 0.0 <= loc["xmin"] <= loc["xmax"] <= 1.0


def test_gemini_api_detection_with_samples():
    """Verify Method 2: End-to-end inference with Gemini Vision API using sample photos"""
    import os
    sample_dir = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "samples")
    front_path = os.path.join(sample_dir, "front_sample.jpg")
    upper_path = os.path.join(sample_dir, "upper_sample.jpg")
    lower_path = os.path.join(sample_dir, "lower_sample.jpg")

    if not (os.path.exists(front_path) and os.path.exists(upper_path) and os.path.exists(lower_path)):
        pytest.skip("Sample images not found")

    with open(front_path, "rb") as f_front, open(upper_path, "rb") as f_upper, open(lower_path, "rb") as f_lower:
        files = {
            "front_image": ("front.jpg", f_front.read(), "image/jpeg"),
            "upper_image": ("upper.jpg", f_upper.read(), "image/jpeg"),
            "lower_image": ("lower.jpg", f_lower.read(), "image/jpeg")
        }

    data = {
        "consent_acknowledged": "true",
        "detection_method": "gemini"
    }
    response = client.post("/api/screenings/analyze", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "completed"
    assert res["detection_method"] == "gemini"
    assert "Gemini" in res.get("model_name", "")
    assert "findings" in res
    assert "view_assessments" in res

