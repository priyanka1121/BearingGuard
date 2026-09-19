<div align="center">

# ⚙️ BearingGuard

### AI-powered bearing fault detection from vibration signals

[![Python](https://img.shields.io/badge/Python-3.x-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-RandomForest-F7931E?logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)

*Turning raw industrial vibration data into real-time fault predictions — end to end.*

</div>

---

## 🧭 Overview

**BearingGuard** is a full-stack machine learning application that detects bearing conditions from vibration signals, combining **signal processing, domain-informed feature engineering, Random Forest classification, FastAPI, and React**.

It takes:

- 📄 A MATLAB `.mat` vibration recording
- ⚙️ Motor RPM

...and returns a fault prediction with confidence scores and a plain-language recommendation.

The project demonstrates the complete journey from raw industrial vibration data to a working ML-powered web application — not just a notebook, but a deployable, testable system.

### 🩺 Supported Conditions

| Condition | Status |
|---|---|
| `normal` | 🟢 No detected bearing fault |
| `inner_race` | 🔴 Inner-race fault |
| `outer_race` | 🔴 Outer-race fault |
| `ball` | 🔴 Ball-element fault |

---

## ✨ Why I Built This

The goal wasn't just to produce a machine-learning notebook — it was to understand how a trained model becomes a *usable application*.

```
Raw Industrial Data
        ↓
Signal Processing
        ↓
Feature Engineering
        ↓
Machine Learning
        ↓
Model Persistence
        ↓
FastAPI Inference API
        ↓
React Frontend
        ↓
End-to-End Testing
```

This project gave me hands-on experience with both the ML side (signal processing, feature engineering, classification) and the software engineering required to serve a model as a real application (APIs, validation, integration testing).

---

## 🧠 How It Works

### 1. Input

The React frontend sends a `.mat` vibration file and motor RPM to the FastAPI backend via a multipart HTTP request.

### 2. Vibration Signal Extraction

The backend reads the `.mat` file with **SciPy**, locates the drive-end vibration signal (following the `_DE_time` naming convention), and flattens it into a 1D sequence.

### 3. Windowing

| Parameter | Value |
|---|---|
| Window size | 2,048 samples |
| Sampling rate | 12,000 Hz |

The first 2,048 samples are used to build the model input.

---

## 📊 Feature Engineering

BearingGuard combines several families of signal features.

### ⏱️ Time-Domain Features
RMS · Standard deviation · Kurtosis · Skewness · Peak · Peak-to-peak · Crest factor

### 📡 Frequency-Domain Features (FFT)
Dominant frequency · Spectral energy · **BPFI**, **BPFO**, **BSF**, **FTF** energy

Shaft frequency is derived as:

```
shaft frequency = RPM / 60
```

Bearing characteristic frequencies (BPFI, BPFO, BSF, FTF) are then estimated using the configured bearing factors, since these frequency regions carry information associated with different fault types.

### 🌊 Envelope Spectrum

Bearing faults often produce repetitive impact patterns that are hard to spot in the raw signal. BearingGuard applies the **Hilbert transform** to obtain the analytic signal and compute the vibration envelope, extracting:

- Envelope BPFI
- Envelope BPFO
- Envelope BSF
- Envelope FTF

---

## 🤖 Machine Learning

The classifier is a **Random Forest**, persisted with **Joblib**:

```
backend/models/bearing_fault_model.pkl
backend/models/feature_columns.pkl
```

Feature ordering is stored separately so the API always sends features to the model in the exact order used during training.

---

## 🏗️ System Architecture

```
                    USER
                     │
                     ▼
             ┌───────────────┐
             │  React UI     │
             │  MAT + RPM    │
             └───────┬───────┘
                     │ HTTP
                     ▼
             ┌───────────────┐
             │   FastAPI     │
             │ /predict-file │
             └───────┬───────┘
                     ▼
             ┌───────────────┐
             │  MAT Parsing  │
             └───────┬───────┘
                     ▼
             ┌───────────────┐
             │ Signal Window │
             │     2048      │
             └───────┬───────┘
                     ▼
          ┌───────────────────────┐
          │  Feature Engineering  │
          │ Time + FFT + Envelope │
          └───────────┬───────────┘
                     ▼
             ┌───────────────┐
             │ Random Forest │
             └───────┬───────┘
                     ▼
             ┌────────────────┐
             │  Prediction +  │
             │ Probabilities  │
             └───────┬────────┘
                     ▼
             ┌────────────────┐
             │  React Result  │
             │  Fault Status  │
             │  Confidence    │
             │ Recommendation │
             └────────────────┘
```

---

## 📁 Project Structure

```
BearingGuard/
│
├── backend/
│   ├── api/
│   │   └── main.py
│   ├── models/
│   │   ├── bearing_fault_model.pkl
│   │   └── feature_columns.pkl
│   ├── notebooks/
│   │   ├── 01_explore_data.ipynb
│   │   └── model.ipynb
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## 🔌 API Reference

### `GET /`
Basic API status check.

```json
{ "message": "BearingGuard API is running" }
```

### `GET /health`
Checks whether the API and model are available.

```json
{ "status": "healthy", "model_loaded": true }
```

### `POST /predict-file`
The main inference endpoint.

**Request** — multipart form data:

| Parameter | Type | Description |
|---|---|---|
| `file` | `.mat` | Vibration recording |
| `rpm` | `number` | Motor RPM |

**Example response:**

```json
{
  "prediction": "outer_race",
  "confidence": 1.0,
  "probabilities": {
    "ball": 0.0,
    "inner_race": 0.0,
    "normal": 0.0,
    "outer_race": 1.0
  },
  "status": "FAULT DETECTED",
  "recommendation": "Inspect bearing for outer race fault."
}
```

---

## 🖥️ Running the Project Locally

### Prerequisites

- Python 3.x
- Node.js & npm
- Git

### 1️⃣ Start the Backend

```bash
# From the project root
python -m venv .venv

# Windows
.venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Start FastAPI
python -m uvicorn backend.api.main:app --reload
```

| Resource | URL |
|---|---|
| API | http://127.0.0.1:8000 |
| Swagger Docs | http://127.0.0.1:8000/docs |
| Health Check | http://127.0.0.1:8000/health |

### 2️⃣ Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints — usually **http://localhost:5173**

### 🔗 Frontend ↔ Backend

```
React (localhost:5173)  ──HTTP POST──▶  FastAPI (127.0.0.1:8000)  ──▶  ML Model
```

The frontend sends the uploaded file and RPM to `POST /predict-file`; FastAPI runs inference and returns JSON, which React renders as the result.

---

## 🧪 Testing

Tested through the complete integration flow:

```
React UI → Input Validation → File Upload → FastAPI → MAT Parsing
→ Signal Processing → Feature Extraction → Random Forest
→ Prediction → API Response → React Result UI
```

| Test Case | Scenario |
|---|---|
| TC-01 | Normal bearing |
| TC-02 | Inner-race fault |
| TC-03 | Ball fault |
| TC-04 | Outer-race fault |
| TC-05 | Missing RPM |
| TC-06 | Invalid RPM |
| TC-07 | Invalid MAT file |
| TC-08 | Frontend ↔ Backend integration |

---

## 🛠️ Engineering Challenges

**Python Environment** — Resolved issues with virtual environments, Uvicorn launcher paths, and dependency versions.

**FastAPI** — Implemented REST endpoints, file uploads, form data, Pydantic validation, CORS, and error handling.

**MATLAB Data** — Built extraction of vibration signals from `.mat` files using SciPy.

**ML Model Compatibility** — Investigated and resolved scikit-learn version-compatibility warnings when loading the persisted Random Forest model.

**Frontend Integration** — Connected React to the FastAPI inference endpoint and handled returned prediction data.

**Input Validation** — Handled invalid/missing RPM input and backend validation failures gracefully.

---

## 📓 Notebooks

Located in `backend/notebooks/`:

- **`01_explore_data.ipynb`** — exploring and understanding the vibration dataset
- **`model.ipynb`** — feature engineering and model-development workflow

The notebooks represent the experimentation phase, while `backend/api/main.py` is the deployed inference logic.

---

<div align="center">

Built with 🔧 signal processing, 🌲 Random Forests, and a lot of debugging.

</div>
