from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from scipy.signal import hilbert
from scipy.stats import kurtosis, skew
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
import io
from scipy.io import loadmat


# --------------------------------------------------
# App  python -m uvicorn backend.api.main:app --reload
# --------------------------------------------------

app = FastAPI(
    title="BearingGuard API",
    description="ML-based bearing fault detection API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://bearing-guard.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --------------------------------------------------
# Model
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"

model = joblib.load(MODEL_DIR / "bearing_fault_model.pkl")
feature_columns = joblib.load(MODEL_DIR / "feature_columns.pkl")


# --------------------------------------------------
# Constants
# --------------------------------------------------

SAMPLING_RATE = 12000
WINDOW_SIZE = 2048

BPFI_FACTOR = 5.4152
BPFO_FACTOR = 3.5848
BSF_FACTOR = 4.7135
FTF_FACTOR = 0.39828


# --------------------------------------------------
# Request format
# --------------------------------------------------

class PredictionRequest(BaseModel):
    signal: list[float]
    rpm: float


# --------------------------------------------------
# Feature extraction
# --------------------------------------------------

def extract_features(segment, rpm):

    # Time-domain features
    rms = np.sqrt(np.mean(segment ** 2))
    std = np.std(segment)
    peak = np.max(np.abs(segment))
    peak_to_peak = np.ptp(segment)

    crest_factor = peak / rms if rms != 0 else 0

    time_features = {
        "rms": rms,
        "std": std,
        "kurtosis": kurtosis(segment, fisher=False),
        "skewness": skew(segment),
        "peak": peak,
        "peak_to_peak": peak_to_peak,
        "crest_factor": crest_factor
    }

    # FFT
    fft_values = np.fft.rfft(segment)
    amplitude = np.abs(fft_values)

    frequencies = np.fft.rfftfreq(
        len(segment),
        d=1 / SAMPLING_RATE
    )

    amplitude[0] = 0

    dominant_frequency = frequencies[
        np.argmax(amplitude)
    ]

    spectral_energy = np.sum(amplitude ** 2)

    shaft_freq = rpm / 60

    bpfi = BPFI_FACTOR * shaft_freq
    bpfo = BPFO_FACTOR * shaft_freq
    bsf = BSF_FACTOR * shaft_freq
    ftf = FTF_FACTOR * shaft_freq

    resolution = SAMPLING_RATE / len(segment)

    def band_energy(target):
        mask = np.abs(frequencies - target) <= resolution
        return np.sum(amplitude[mask])

    frequency_features = {
        "dominant_frequency": dominant_frequency,
        "spectral_energy": spectral_energy,
        "bpfi_energy": band_energy(bpfi),
        "bpfo_energy": band_energy(bpfo),
        "bsf_energy": band_energy(bsf),
        "ftf_energy": band_energy(ftf)
    }

    # Envelope spectrum
    signal_centered = segment - np.mean(segment)

    analytic_signal = hilbert(signal_centered)
    envelope = np.abs(analytic_signal)

    envelope_fft = np.abs(
        np.fft.rfft(envelope)
    )

    envelope_fft[0] = 0

    def envelope_band_energy(target):
        mask = np.abs(frequencies - target) <= resolution
        return np.sum(envelope_fft[mask])

    envelope_features = {
        "env_bpfi": envelope_band_energy(bpfi),
        "env_bpfo": envelope_band_energy(bpfo),
        "env_bsf": envelope_band_energy(bsf),
        "env_ftf": envelope_band_energy(ftf)
    }

    return {
        **time_features,
        **frequency_features,
        **envelope_features
    }


# --------------------------------------------------
# Routes
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "BearingGuard API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": True
    }

def load_signal_from_mat(file_bytes):
    data = loadmat(io.BytesIO(file_bytes))

    de_keys = [
        key
        for key in data.keys()
        if key.endswith("_DE_time")
    ]

    if not de_keys:
        raise ValueError(
            "No drive-end vibration signal found in the MAT file."
        )

    vibration_signal = data[de_keys[0]].flatten()

    return vibration_signal

@app.post("/predict-file")
async def predict_file(
    file: UploadFile = File(...),
    rpm: float = Form(...)
):
    try:
        if rpm <= 0:
            raise HTTPException(
                status_code=400,
                detail="RPM must be greater than 0."
            )
        # Read uploaded MAT file
        file_bytes = await file.read()

        # Load vibration signal
        vibration_signal = load_signal_from_mat(file_bytes)

        if len(vibration_signal) < WINDOW_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Signal must contain at least {WINDOW_SIZE} samples."
            )

        # Use the same window size as training
        segment = vibration_signal[:WINDOW_SIZE]

        # Extract features
        extracted_features = extract_features(segment, rpm)

        # Check required features
        missing_features = [
            column
            for column in feature_columns
            if column not in extracted_features
        ]

        if missing_features:
            raise HTTPException(
                status_code=500,
                detail=f"Missing model features: {missing_features}"
            )

        # Create model input
        X = np.array(
            [extracted_features[column] for column in feature_columns],
            dtype=float
        ).reshape(1, -1)

        # Predict
        prediction = model.predict(X)[0]

        probabilities = model.predict_proba(X)[0]

        class_probabilities = {
            str(label): float(probability)
            for label, probability in zip(
                model.classes_,
                probabilities
            )
        }

        confidence = float(max(probabilities))

        if prediction == "normal":
            status = "HEALTHY"
            recommendation = "No immediate maintenance action required."
        else:
            status = "FAULT DETECTED"
            recommendation = (
                f"Inspect bearing for "
                f"{str(prediction).replace('_', ' ')} fault."
            )

        return {
            "prediction": str(prediction),
            "confidence": confidence,
            "probabilities": class_probabilities,
            "status": status,
            "recommendation": recommendation,
            "filename": str(file.filename),
        }

    except HTTPException:
        raise

    except Exception as error:
        print("PREDICTION ERROR:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )