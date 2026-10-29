# Approach B: Open-Source AI Inference Service for Scanio.ai

This module implements **Approach B (Open-Source AI Model)** for Scanio.ai as an independent, open-source computer vision detection service complementing **Approach A (Google Gemini API)**.

> **Medical Screening Disclaimer**:
> This open-source inference system is an experimental preliminary visual screening tool and prototype. It does **NOT** provide a clinical diagnosis, confirm dental health, or formulate treatment recommendations. Visual photographic screening cannot detect subsurface caries or periodontal bone loss. All predictions must be evaluated by a licensed dental professional.

---

## 1. Modality Compatibility & Candidate Evaluation

| Candidate Resource | Modality | Compatibility with Scanio.ai | Status & Finding |
|---|---|---|---|
| **1. AndreyGermanov/yolov8_caries_detector** | Intraoral Color Photography | **Compatible** | Uses intraoral clinical photographs matching Scanio.ai's 3-view smartphone protocol. |
| **2. DentalAI Dataset (DatasetNinja / Roboflow)** | Intraoral Color Photography | **Compatible** | 2,495 clinical intraoral photos annotated for tooth, caries, cavity, and crack. |
| **3. Sina-Imaginative/dental-caries-detection** | Dental Radiographs (X-Rays) | **Incompatible** | Trained on radiographic projection images (panoramic/bitewings). Cannot be applied to surface optical photographs. |

**Image Format Compatibility**:
- **Supported Inputs**: Standard RGB photographs (`image/jpeg`, `image/png`, `image/webp`).
- **Rejected Inputs**: PDFs, text documents, DICOM/raw X-rays, corrupt payloads, and files $> 10\text{ MB}$.
- **Resolution**: Minimum $100 \times 100$ px; automatically padded/resized to $640 \times 640$ via letterbox preprocessing during YOLO inference.

---

## 2. Target Classes & Checkpoint Information

- **Architecture**: Ultralytics YOLOv8 / YOLO11 Object Detection Network
- **Pretrained Weights**: `runs/dental/baseline/weights/best.pt`
- **Class Mappings**:
  - `0: suspected_caries` – Visible enamel pit/fissure demineralization or cavitation
  - `1: gum_redness` – Visible marginal gingival erythema
  - `2: tooth_discoloration` – Extrinsic/intrinsic enamel chromatic variation
  - `3: tooth_chip` – Incisal edge / cusp structure loss or fracture
  - `4: oral_lesion` – Circumscribed mucosal tissue variation
- **License**:
  - Code & Architecture: AGPL-3.0 / MIT
  - Weights & Dataset: Research & Prototype Screening Use

---

## 3. Standalone FastAPI Inference Service

The service runs independently on FastAPI and provides standardized detection endpoints.

### Quick Start
```powershell
# From the project root
.\DentalAI-Model\run_opensource_service.bat
# Or using PowerShell
.\DentalAI-Model\run_opensource_service.ps1
```
The service will start on `http://127.0.0.1:8001`.

### API Endpoints

#### 1. `GET /api/health`
Checks model availability, active compute device (`cpu` or `cuda:0`), and supported target classes.

**Response**:
```json
{
  "status": "ok",
  "service": "Scanio.ai Open-Source Dental Inference Service",
  "version": "2.0.0",
  "model_loaded": true,
  "device": "cpu",
  "weights_path": "E:\\Dental AI Website\\DentalAI-Model\\runs\\dental\\baseline\\weights\\best.pt",
  "target_classes": {
    "0": "suspected_caries",
    "1": "gum_redness",
    "2": "tooth_discoloration",
    "3": "tooth_chip",
    "4": "oral_lesion"
  }
}
```

#### 2. `POST /api/predict`
Accepts a single intraoral photograph and returns actual model bounding boxes and confidence scores.

**Parameters** (Multipart Form):
- `file`: Image file (`JPEG`, `PNG`, or `WebP`, $\le 10\text{ MB}$)
- `conf` (optional float, default `0.25`): Minimum confidence threshold
- `view` (optional string): View identifier (`front`, `upper`, or `lower`)

**Example curl**:
```bash
curl -X POST "http://127.0.0.1:8001/api/predict" \
  -F "file=@frontend/public/samples/front_sample.jpg" \
  -F "conf=0.20" \
  -F "view=front"
```

**Response**:
```json
{
  "status": "success",
  "model": "Ultralytics YOLO (Trained Checkpoint: best.pt)",
  "view": "front",
  "image_width": 1280,
  "image_height": 960,
  "count": 1,
  "predictions": [
    {
      "class_id": 1,
      "class_name": "gum_redness",
      "confidence": 0.386,
      "pixel_box": [491.6, 629.6, 754.3, 694.7],
      "normalized_box": {
        "ymin": 0.7027,
        "xmin": 0.4096,
        "ymax": 0.7753,
        "xmax": 0.6286
      },
      "severity_category": "mild_concern"
    }
  ],
  "inference_time_ms": 166.8,
  "disclaimer": "EXPERIMENTAL PROTOTYPE ONLY: This open-source AI screening service provides automated preliminary visual observations..."
}
```

#### 3. `POST /api/predict/multi-view`
Processes the standardized Scanio.ai 3-view protocol (`front`, `upper`, `lower`) in a single call.

---

## 4. Training & Dataset Preparation Guide

To ensure scientific validity and avoid data leakage:
- **Patient-Level Separation**: Images from the same subject must never appear in both training and test sets.
- **Reproducible Script**: `create_dataset.py` splits patients deterministically (`SEED = 42`).
- **Fine-Tuning Execution**:
  ```powershell
  python train.py
  ```
- **Held-Out Evaluation**:
  ```powershell
  python evaluate.py
  ```

> **Dataset Download Notice**: Per project protocol, large datasets (e.g. from DatasetNinja or Roboflow) are not downloaded automatically until explicit user confirmation and requirements review. Scripts `download_roboflow.py` and `import_dataset.py` are provided for immediate execution upon approval.

---

## 5. Automated Tests

Run the standalone open-source API test suite:
```powershell
backend\.venv\Scripts\pytest DentalAI-Model\test_api.py -v
```

Tests verified:
1. `test_health_check_endpoint`: Confirms model readiness and diagnostic classes.
2. `test_predict_single_sample_image`: Validates actual YOLO detection on clinical sample.
3. `test_predict_synthetic_valid_image`: Confirms structured JSON response on valid input.
4. `test_reject_unsupported_file_extension`: Asserts rejection of text/PDF documents.
5. `test_reject_oversized_file`: Asserts HTTP 413 when file $> 10\text{ MB}$.
6. `test_reject_corrupt_image`: Asserts HTTP 400 on truncated/corrupted files.
7. `test_multi_view_scanio_endpoint`: Validates the complete 3-view Scanio.ai protocol.

---

## 6. Architecture Comparison

| Feature | Approach A: Google Gemini API | Approach B: Open-Source YOLO Model |
|---|---|---|
| **Model** | Google Gemini 2.5 Flash | Fine-Tuned Ultralytics YOLOv8/11 |
| **Execution** | Cloud API (Google Generative AI) | Local Edge / Standalone Python Microservice |
| **Data Privacy** | Images transmitted to Google Cloud | $100\%$ local, zero external network transmission |
| **Inference Latency** | $\sim 5\text{--}8\text{ seconds}$ | $\sim 150\text{--}250\text{ ms}$ (CPU) / $\sim 15\text{ ms}$ (GPU) |
| **Cost** | API usage quota / cost per token | Free & Open-Source ($0$ inference cost) |
| **Reasoning Type** | Holistic multimodal clinical reasoning | Spatial bounding box object detection |
| **Offline Capability** | Requires active internet connection | Runs completely offline |
