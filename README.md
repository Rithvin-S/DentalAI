# DentalAI — AI-Assisted Intraoral Visual Screening Prototype

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20+%20Vite-61DAFB?style=flat&logo=react)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python)](https://python.org)
[![Status](https://img.shields.io/badge/Status-Prototype%20v1.0-00F5D4?style=flat)](#)

DentalAI is an AI-assisted visual screening research prototype that allows users to submit three standardized intraoral photographs (**Front View**, **Upper View**, and **Lower View**) and receive structured screening observations with normalized coordinate bounding markers over original images.

> **CRITICAL MEDICAL DISCLAIMER**: DentalAI is an exploratory research prototype and **NOT a certified diagnostic medical device**. Ordinary photographs cannot detect subsurface decay, interproximal cavities between teeth, or periodontal bone loss. A screening with no reported findings does NOT guarantee dental health. Findings must be evaluated in person by a licensed dental professional.

---

## Architecture & Project Structure

```
Dental AI Website/
├── frontend/                     # React + TypeScript + Vite Frontend
│   ├── public/samples/           # Clinical intraoral demo photos (Front, Upper, Lower)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx              # Brand, live health status, theme toggle
│   │   │   ├── UrgentWarningBanner.tsx # Static emergency safety warning (FR-18)
│   │   │   ├── CaptureGuideModal.tsx   # Visual 3-view photo capture guide (FR-01)
│   │   │   ├── ConsentModal.tsx        # Plain-language privacy & consent notice (FR-08)
│   │   │   ├── PhotoUploadCard.tsx     # Drag-and-drop cards with independent preview (FR-02-FR-06)
│   │   │   └── AnnotatedImage.tsx      # SVG normalized coordinate overlay & zoom viewer (FR-12)
│   │   ├── pages/
│   │   │   ├── UploadPage.tsx          # 3-view upload flow & scenario selector
│   │   │   └── ResultsPage.tsx         # Multi-view report, findings list & print export
│   │   ├── services/api.ts             # Backend API client
│   │   ├── types/screening.ts          # TypeScript type definitions
│   │   ├── App.tsx                     # Top-level state & object URL cleanup (AT-13)
│   │   └── index.css                   # Medical-tech glassmorphism design system
│   └── package.json
│
├── backend/                      # Python + FastAPI Backend
│   ├── app/
│   │   ├── core/config.py              # Environment variables & CORS settings
│   │   ├── schemas/screening.py        # Pydantic schemas for findings & bounding boxes
│   │   ├── services/vision_model.py    # Multi-provider vision adapter (Gemini, OpenAI, Mock)
│   │   ├── routes/screenings.py        # POST /api/screenings/analyze endpoint
│   │   └── main.py                     # FastAPI entrypoint & safe error middleware
│   ├── tests/
│   │   └── test_screenings.py          # Pytest suite verifying SRS Acceptance Tests
│   ├── requirements.txt
│   └── .env.example
├── .gitignore
└── README.md
```

---

## Key Features & SRS Compliance

1. **Standardized 3-View Protocol (FR-01 to FR-04)**:
   - Front view: "Front teeth and gums"
   - Upper view: "Upper teeth and palate"
   - Lower view: "Lower teeth and mouth"
2. **Strict Server-Side Validation (FR-05, AT-03, AT-04)**:
   - File size limits (max 10 MB per image)
   - Accepted MIME types (JPEG, PNG, WebP)
   - Pillow decodability & integrity inspection
3. **Client-Side Image Lifecycle & Privacy (FR-06, FR-17, AT-13)**:
   - Instant previews and independent image replacement
   - Explicit `URL.revokeObjectURL` cleanup preventing memory leaks
   - Transient in-memory processing only; no disk persistence of health photos
4. **Mandatory Informed Consent (FR-08, AT-06)**:
   - Transparent data processing notice
   - Enforced client & backend rejection if consent is missing
5. **Multi-Provider Vision Adapter (FR-10, FR-16)**:
   - **Google Gemini** (1.5 / 2.0 Flash) vision support
   - **OpenAI** (GPT-4o) vision support
   - **Intelligent Offline/Demo Mode**: Runs completely offline out-of-the-box with realistic observations and coordinate bounding boxes if no API keys are provided
6. **High-Precision Visual Annotations (FR-12, AT-07, AT-08)**:
   - Normalized bounding coordinates `[ymin, xmin, ymax, xmax]` (0.0 to 1.0)
   - Dynamic SVG scaling matching actual rendered image dimensions
   - Bidirectional hover highlighting between findings list and image markers
   - Honest uncertainty: Never fabricates coordinates for text-only observations
7. **Clinical Safety & Non-Diagnostic Messaging (FR-14, FR-15, FR-18)**:
   - Clear "No obvious abnormality detected in these photos" status (never states "You are healthy")
   - Suboptimal image quality detection ("Unable to assess this view")
   - Persistent Emergency Warning Banner for severe symptoms (facial swelling, breathing difficulty)
   - Print/Export Summary action for consulting a dentist in person

---

## Quickstart Guide

### 1. Start Backend (FastAPI)

```bash
cd backend

# Create virtual environment (if not already created)
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server on port 8000
uvicorn app.main:app --reload --port 8000
```
Backend API will be running at: `http://127.0.0.1:8000`  
Interactive Swagger Docs: `http://127.0.0.1:8000/api/docs`

#### Running Backend Acceptance Tests:
```bash
cd backend
.venv\Scripts\python -m pytest -v
```

### 2. Start Frontend (React + Vite)

In a separate terminal:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend will be running at: `http://localhost:5173`

---

## Optional: Configuring Real AI Vision Providers

By default, DentalAI runs in auto/high-fidelity simulation mode so you can test all features and workflows immediately without requiring external API keys.

To use Google Gemini or OpenAI:
1. In `backend/`, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Add your API key:
   ```env
   # Google Gemini
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-1.5-flash

   # Or OpenAI
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4o
   ```
3. Restart the backend server. The backend will automatically detect the key and switch to live vision model inference.
