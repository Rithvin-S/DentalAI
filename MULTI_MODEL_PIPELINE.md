# DentalAI Multi-Model Implementation: OpenCV • YOLOv8 • U-Net • ResNet

This document outlines the coordinated dental visual screening pipeline implemented according to `DentalAI_Multi_Model_Implementation_Plan.docx`.

All existing models are preserved:
- **Approach A (Method 2)**: Google Gemini 2.5 Flash Multimodal Vision API
- **Approach B (Method 1)**: Open-Source Fine-Tuned YOLOv8 Dental Detector
- **Method 3 (New Coordinated Ensemble)**: OpenCV • YOLOv8 • U-Net • ResNet 4-Stage Pipeline

---

## 1. System Architecture

```
[ Intraoral Photographs (Front, Upper, Lower) ]
                       │
                       ▼
          ┌─────────────────────────┐
          │   Phase 1: OpenCV       │
          │   Image Processor       │
          │   - Format Validation   │
          │   - LAB CLAHE on L-chan │
          │   - Bilateral Denoising │
          └────────────┬────────────┘
                       │
                       ▼
          ┌─────────────────────────┐
          │   Phase 2: YOLOv8       │
          │   Dental Detector       │
          │   - Bounding Boxes      │
          │   - Landmark Detection  │
          └────────────┬────────────┘
                       │ Region Extraction (with Context Margin)
                       ▼
          ┌─────────────────────────┬─────────────────────────┐
          │   Phase 3: U-Net        │   Phase 4: ResNet-18    │
          │   Pixel Segmentation    │   Visual Categorization │
          │   - Dice + BCE Loss     │   - 6 Category Softmax  │
          │   - Mask Polygons (SVG) │   - Uncertainty Flag    │
          │   - View Area Coverage %│   - Clinical Notes      │
          └────────────┬────────────┴────────────┬────────────┘
                       │                         │
                       └────────────┬────────────┘
                                    │
                                    ▼
          ┌───────────────────────────────────────────────────┐
          │   Phase 5: Dental Pipeline & Report Layer         │
          │   - Cautious Non-Diagnostic Screening Summary    │
          │   - Coordinated Multi-Model Attribution           │
          │   - FastAPI JSON Schema with Mask Overlays        │
          └─────────────────────────┬─────────────────────────┘
                                    │
                                    ▼
          ┌───────────────────────────────────────────────────┐
          │   React + TypeScript Frontend                     │
          │   - Multi-Engine Selector (3 Available AI Engines)│
          │   - Interactive Annotated View with SVG Masks     │
          │   - Bounding Box & U-Net Mask Toggle Controls     │
          │   - ResNet Category & Uncertainty Breakdown       │
          │   - 1-Click Multi-Engine Comparison Switcher      │
          └───────────────────────────────────────────────────┘
```

---

## 2. Component Specifications

### 2.1. OpenCV Preprocessor (`backend/app/preprocessing/image_processor.py`)
- **Validation**: Checks channels (RGB/BGR), minimum dimensions ($100 \times 100$), and aspect ratio sanity.
- **Color-Safe Contrast Enhancement**: Converts image to CIE-LAB color space and applies CLAHE strictly to the Lightness ($L^*$) channel (`clipLimit=2.0`, `tileGridSize=(8, 8)`). This leaves $A^*$ (green-red) and $B^*$ (blue-yellow) intact, preserving clinical signs of gingival erythema and enamel discoloration.
- **Denoising**: Light bilateral filtering (`d=5, sigmaColor=25, sigmaSpace=25`) smooths sensor noise without blurring sharp tooth margins or fissure borders.

### 2.2. YOLOv8 Localization (`backend/app/detection/yolo_detector.py`)
- **Model Checkpoint**: `backend/models/yolov8/best.pt`
- **Output**: Returns candidate bounding boxes $[y_{\min}, x_{\min}, y_{\max}, x_{\max}]$ normalized to $0.0-1.0$, confidence scores, and pixel coordinates for extraction.

### 2.3. U-Net Segmentation (`backend/app/segmentation/unet_segmenter.py`)
- **Model Architecture**: PyTorch U-Net with contracting path (DoubleConv + MaxPool), bottleneck, expanding path (ConvTranspose + Skip Concatenations), and $1 \times 1$ Conv with Sigmoid.
- **Loss**: Combined Dice Loss + Binary Cross-Entropy (BCE).
- **Coordinate Transformation**: Detects contours using OpenCV `findContours`, applies polygon approximation (`approxPolyDP`), and maps coordinates from crop space back to the full view's normalized coordinate system for responsive SVG overlay rendering in React.
- **Metrics**: Computes Dice confidence score and view coverage percentage.

### 2.4. ResNet-18 Categorization (`backend/app/classification/resnet_classifier.py`)
- **Model Architecture**: ResNet-18 with adapted classification head for 6 dental categories:
  1. `suspected_caries` (Suspected Enamel / Fissure Cavitation)
  2. `gum_redness` (Marginal Gingival Erythema)
  3. `tooth_discoloration` (Enamel Chromatic Discoloration)
  4. `tooth_chip` (Incisal / Occlusal Tooth Structure Loss)
  5. `oral_lesion` (Oral Mucosal Tissue Variation)
  6. `sound_enamel` (Sound Enamel / Unremarkable Tissue)
- **Uncertainty Estimation**: Flags `"review_recommended"` when top-1 confidence $< 0.45$ or margin between top-1 and top-2 $< 0.12$, avoiding forced overconfident predictions.

---

## 3. Training & Evaluation Results

The reproducible training and evaluation script `backend/train_multi_model.py` was executed with patient-level isolation (train `pt_01`–`pt_11`, val `pt_12`–`pt_13`, test `pt_14`–`pt_16`):

- **U-Net Segmentation**:
  - Training: 8 epochs with Dice + BCE Loss
  - Validation Loss: Reduced to 1.2015
  - Held-out Test Patient Evaluation: Mean Dice Score $= 0.3135$, Mean IoU $= 0.2034$
  - Weights: `backend/models/unet/best.pth`
- **ResNet Classification**:
  - Training: 8 epochs with CrossEntropyLoss
  - Validation Accuracy: $100.0\%$
  - Held-out Test Patient Evaluation: Accuracy $= 100.0\%$ ($20/20$ test crops)
  - Weights: `backend/models/resnet/best.pth`
- **Evaluation Artifact**: `backend/models/multi_model_evaluation.json`

---

## 4. API Endpoints

1. **Unified Screening Endpoint**:
   `POST /api/screenings/analyze`
   - Accepts multipart form: `front_image`, `upper_image`, `lower_image`, `consent_acknowledged: true`, `detection_method: "multi_model" | "yolo" | "gemini"`.
   - Returns structured `ScreeningResponse` containing `localization`, `segmentation`, and `classification`.

2. **Dedicated Pipeline Endpoint**:
   `POST /api/screenings/pipeline/analyze`
   - Direct shortcut for the 4-stage pipeline.

3. **Public Configuration**:
   `GET /api/screenings/config-info`
   - Returns public configuration and lists all 3 selectable detection engines.

---

## 5. Verification & Test Suite

- **Backend Pytest**: 12/12 passed (`backend\tests\test_screenings.py`)
- **Open-Source YOLO API Pytest**: 7/7 passed (`DentalAI-Model\test_api.py`)
- **Frontend TypeScript & Vite**: Built in 13.32s with 0 errors (`npm run build`)

---

## Clinical Safety Notice
All observations produced by the Multi-Model Dental AI Pipeline are preliminary screening suggestions for triage and educational assistance only. They do not constitute a medical diagnosis, treatment plan, or radiographic assessment. All findings must be evaluated clinically by a licensed dentist.

