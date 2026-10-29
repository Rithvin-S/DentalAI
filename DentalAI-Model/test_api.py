import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from api import app, MAX_FILE_SIZE_BYTES

client = TestClient(app)


def create_test_image(format="JPEG", size=(400, 400), color=(220, 180, 180)):
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    buf.seek(0)
    return buf.getvalue()


def test_health_check_endpoint():
    """Step 2: GET /api/health returns model status and loaded classes."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["ok", "degraded"]
    assert "model_loaded" in data
    assert "target_classes" in data
    assert data["service"] == "Scanio.ai Open-Source Dental Inference Service"


def test_predict_single_sample_image():
    """Step 2 & 3: POST /api/predict with real intraoral photo returns actual YOLO detections."""
    sample_path = Path(__file__).resolve().parents[1] / "frontend" / "public" / "samples" / "front_sample.jpg"
    if not sample_path.exists():
        pytest.skip(f"Sample image not found: {sample_path}")

    with open(sample_path, "rb") as f:
        img_bytes = f.read()

    files = {"file": ("front_sample.jpg", img_bytes, "image/jpeg")}
    data = {"conf": "0.20", "view": "front"}
    
    res = client.post("/api/predict", files=files, data=data)
    assert res.status_code == 200
    out = res.json()
    assert out["status"] == "success"
    assert "predictions" in out
    assert out["image_width"] > 0
    assert out["image_height"] > 0
    assert "inference_time_ms" in out
    assert "disclaimer" in out

    # Check bounding box structure on any detections
    for pred in out["predictions"]:
        assert "class_name" in pred
        assert "confidence" in pred
        assert 0.0 <= pred["confidence"] <= 1.0
        norm_box = pred["normalized_box"]
        assert 0.0 <= norm_box["ymin"] <= norm_box["ymax"] <= 1.0
        assert 0.0 <= norm_box["xmin"] <= norm_box["xmax"] <= 1.0


def test_predict_synthetic_valid_image():
    """POST /api/predict on synthetic valid image returns structured prediction output."""
    img_bytes = create_test_image("PNG")
    files = {"file": ("test_tooth.png", img_bytes, "image/png")}
    
    res = client.post("/api/predict", files=files)
    assert res.status_code == 200
    out = res.json()
    assert out["status"] == "success"
    assert isinstance(out["predictions"], list)


def test_reject_unsupported_file_extension():
    """Step 2: Reject non-image unsupported format (e.g. .txt, .pdf)."""
    fake_txt = b"This is a text file, not a dental photo."
    files = {"file": ("notes.txt", fake_txt, "text/plain")}
    
    res = client.post("/api/predict", files=files)
    assert res.status_code in [400, 415]
    assert "unsupported" in res.json()["detail"].lower() or "extension" in res.json()["detail"].lower()


def test_reject_oversized_file():
    """Step 2: Reject files exceeding 10MB."""
    oversized = b"0" * (MAX_FILE_SIZE_BYTES + 1024)
    files = {"file": ("huge_photo.jpg", oversized, "image/jpeg")}
    
    res = client.post("/api/predict", files=files)
    assert res.status_code == 413
    assert "10 mb" in res.json()["detail"].lower()


def test_reject_corrupt_image():
    """Step 2: Reject corrupt or non-decodable image payload."""
    corrupt = b"\xFF\xD8\xFF\xE0\x00\x10JFIF corrupted truncated bytes"
    files = {"file": ("corrupt.jpg", corrupt, "image/jpeg")}
    
    res = client.post("/api/predict", files=files)
    assert res.status_code == 400
    assert "corrupt" in res.json()["detail"].lower() or "decoded" in res.json()["detail"].lower()


def test_multi_view_scanio_endpoint():
    """Step 2: Multi-view 3-photo Scanio.ai screening endpoint."""
    img_bytes = create_test_image("JPEG")
    files = {
        "front": ("front.jpg", img_bytes, "image/jpeg"),
        "upper": ("upper.jpg", img_bytes, "image/jpeg"),
        "lower": ("lower.jpg", img_bytes, "image/jpeg")
    }
    
    res = client.post("/api/predict/multi-view", files=files)
    assert res.status_code == 200
    out = res.json()
    assert out["status"] == "completed"
    assert "views" in out
    assert "front" in out["views"]
    assert "upper" in out["views"]
    assert "lower" in out["views"]
    assert "disclaimer" in out

