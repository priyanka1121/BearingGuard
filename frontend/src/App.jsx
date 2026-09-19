import { useState } from "react";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  FileCog,
  Gauge,
  ShieldCheck,
  Upload,
  Zap,
  AlertTriangle,
} from "lucide-react";

import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [rpm, setRpm] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError("");
    }
  };

  const handleAnalyze = async () => {
    setError("");
    setResult(null);

    if (!file) {
      setError("Please select a .MAT vibration file.");
      return;
    }

    if (!rpm) {
      setError("Please enter the motor RPM.");
      return;
    }

    if (Number(rpm) <= 0) {
      setError("Please enter a valid motor RPM greater than 0.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("rpm", rpm);

      const response = await fetch(
        "http://127.0.0.1:8000/predict-file",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Prediction failed."
        );
      }

      setResult(data);

    } catch (err) {
      setError(err.message);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">

      {/* HEADER */}
      <header className="header">

        <div className="brand">

          <div className="brand-logo">
            <Activity size={24} />
          </div>

          <div className="brand-copy">

            <div className="brand-name">
              Bearing<span>Guard</span>
            </div>

            <div className="brand-tagline">
              AI-powered bearing fault detection
            </div>

          </div>

        </div>

        <div className="api-status">
          <span className="api-dot"></span>
          API Connected
        </div>

      </header>


      {/* MAIN */}
      <main className="main">

        {/* LEFT SIDE */}
        <section className="intro">

          <div className="eyebrow">
            PREDICTIVE MAINTENANCE
          </div>

          <h1>
            Detect Bearing Faults
            <span>Before They Fail</span>
          </h1>

          <p className="description">
            BearingGuard uses machine learning to analyze vibration
            signals and detect common bearing faults — helping prevent
            equipment failures and reduce downtime.
          </p>


          <div className="feature-grid">

            <FeatureCard
              icon={<Activity />}
              title="AI-Powered Analysis"
              text="Signal processing and machine learning analyze vibration patterns."
            />

            <FeatureCard
              icon={<ShieldCheck />}
              title="Detects 4 Conditions"
              text="Normal, inner race, outer race, and ball faults."
            />

            <FeatureCard
              icon={<Zap />}
              title="Fast & Simple"
              text="Upload a .MAT file, enter RPM, and get an instant diagnosis."
            />

            <FeatureCard
              icon={<BarChart3 />}
              title="Built for Real-World Use"
              text="Designed for early fault detection and maintenance decisions."
            />

          </div>


          <div className="quote">
            <span />
            <p>
              “Smarter maintenance. Longer machine life.”
            </p>
          </div>

        </section>


        {/* RIGHT SIDE */}
        <section className="analysis-card">

          {/* HEADER */}

          <div className="analysis-heading">

            <div className="heading-icon">
              <FileCog size={23} />
            </div>

            <div>

              <h2>
                Analyze Vibration Signal
              </h2>

              <p>
                Upload vibration data and get a fault prediction
                using the trained ML model.
              </p>

            </div>

          </div>


          {/* UPLOAD */}

          <label className="upload-box">

            <input
              type="file"
              accept=".mat"
              onChange={handleFileChange}
            />

            <div className="upload-icon">
              <Upload size={28} />
            </div>

            <h3>
              {file
                ? file.name
                : "Upload Vibration Data (.MAT)"}
            </h3>

            <p>
              {file
                ? "File selected successfully"
                : "Drag and drop your file here or click to browse"}
            </p>

            <span className="choose-button">
              {file
                ? "Change File"
                : "Choose File"}
            </span>

            <small>
              Supported format: .MAT
            </small>

          </label>


          {/* RPM */}

          <div className="rpm-row">

            <div className="rpm-info">

              <div className="rpm-icon">
                <Gauge size={20} />
              </div>

              <div>

                <label htmlFor="rpm">
                  Motor Speed
                </label>

                <span>
                  RPM
                </span>

              </div>

            </div>


            <input
              id="rpm"
              type="number"
              value={rpm}
              onChange={(event) =>
                setRpm(event.target.value)
              }
              placeholder="e.g. 1725"
            />

          </div>


          {/* ERROR */}

          {error && (
            <div className="error-message">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}


          {/* ANALYZE */}

          <button
            className="analyze-button"
            onClick={handleAnalyze}
            disabled={loading}
          >

            <BrainCircuit size={19} />

            <span>
              {loading
                ? "Analyzing..."
                : "Analyze Bearing"}
            </span>

          </button>


          {/* RESULTS */}

          <div className="divider" />


          <div className="results-heading">

            <div className="results-icon">
              <BarChart3 size={20} />
            </div>

            <div>

              <h2>
                Results
              </h2>

              <p>
                {result
                  ? "ML model analysis complete."
                  : "Prediction results will appear here."}
              </p>

            </div>

          </div>


          {result ? (
            <ResultCard result={result} />
          ) : (
            <div className="empty-result">

              <div className="empty-result-icon">
                <CheckCircle2 size={24} />
              </div>

              <h3>
                No analysis yet
              </h3>

              <p>
                Upload a file and click{" "}
                <strong>
                  "Analyze Bearing"
                </strong>{" "}
                to get results.
              </p>

            </div>
          )}

        </section>

      </main>

    </div>
  );
}


/* =========================================================
   FEATURE CARD
   ========================================================= */

function FeatureCard({ icon, title, text }) {

  return (
    <div className="feature-card">

      <div className="feature-icon">
        {icon}
      </div>

      <div className="feature-content">

        <h3>
          {title}
        </h3>

        <p>
          {text}
        </p>

      </div>

    </div>
  );
}


/* =========================================================
   RESULT CARD
   ========================================================= */

function ResultCard({ result }) {

  const isHealthy =
    result.prediction === "normal";

  const predictionName =
    result.prediction
      .replace("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );

  const confidence =
    (result.confidence * 100).toFixed(1);


  return (
    <div
      className={`result-card ${
        isHealthy ? "healthy" : "fault"
      }`}
    >

      <div className="result-top">

        <div className="result-status-icon">

          {isHealthy ? (
            <CheckCircle2 size={24} />
          ) : (
            <AlertTriangle size={24} />
          )}

        </div>

        <div>

          <div className="result-status">
            {result.status}
          </div>

          <div className="prediction">
            {predictionName}
          </div>

        </div>

        <div className="confidence">
          <strong>{confidence}%</strong>
          <span>confidence</span>
        </div>

      </div>


      <div className="probabilities">

        {Object.entries(result.probabilities).map(
          ([label, probability]) => {

            const percentage =
              probability * 100;

            return (
              <div
                className="probability-row"
                key={label}
              >

                <div className="probability-label">
                  <span>
                    {label.replace("_", " ")}
                  </span>

                  <span>
                    {percentage.toFixed(1)}%
                  </span>
                </div>

                <div className="probability-bar">
                  <div
                    className="probability-fill"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>

              </div>
            );
          }
        )}

      </div>


      <div className="recommendation">

        <span>
          Recommendation
        </span>

        <p>
          {result.recommendation}
        </p>

      </div>

    </div>
  );
}


export default App;