// All backend details live in this one file.
// Compare the three CONFIG lines with the fetch call in your old App.jsx.
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(
  /\/$/,
  "",
);
const PREDICT_PATH = "/predict-file"; // CONFIG 1: your prediction route
const FILE_FIELD = "file"; //      CONFIG 2: form field name for the .mat file
const RPM_FIELD = "rpm"; //        CONFIG 3: form field name for the motor speed

export async function checkServer() {
  try {
    const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(5000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

const kindOf = (text = "") => {
  const t = String(text).toLowerCase();
  if (t.includes("inner")) return "inner";
  if (t.includes("outer")) return "outer";
  if (t.includes("ball")) return "ball";
  if (t.includes("normal") || t.includes("healthy")) return "normal";
  return null;
};

function normalize(data) {
  const raw =
    data.probabilities ?? data.probs ?? data.class_probabilities ?? {};
  const probs = { normal: 0, inner: 0, outer: 0, ball: 0 };
  Object.entries(raw).forEach(([k, v]) => {
    const key = kindOf(k);
    if (key) probs[key] = Number(v) || 0;
  });
  const top = Math.max(...Object.values(probs));
  const scale = top <= 1 ? 100 : 1;
  Object.keys(probs).forEach((k) => (probs[k] *= scale));

  const label =
    data.prediction ??
    data.fault ??
    data.label ??
    data.predicted_class ??
    data.result;
  const kind =
    kindOf(label) ?? Object.keys(probs).sort((a, b) => probs[b] - probs[a])[0];
  let confidence =
    data.confidence != null ? Number(data.confidence) : probs[kind];
  if (confidence <= 1) confidence *= 100;
  return { kind, confidence, probs, recommendation: data.recommendation || "" };
}

export async function predict(file, rpm) {
  const body = new FormData();
  body.append(FILE_FIELD, file);
  body.append(RPM_FIELD, rpm);
  let res;
  try {
    res = await fetch(`${BASE}${PREDICT_PATH}`, { method: "POST", body });
  } catch {
    throw new Error(
      "Could not reach the analysis server. Check your connection and try again.",
    );
  }
  if (!res.ok) {
    let msg = "The server could not analyze this file.";
    try {
      const j = await res.json();
      const d = j.detail ?? j.error;
      if (d) msg = typeof d === "string" ? d : JSON.stringify(d);
    } catch {
      /* keep default message */
    }
    throw new Error(msg);
  }
  return normalize(await res.json());
}
