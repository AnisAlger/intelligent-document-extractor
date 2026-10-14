import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [email, setEmail] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera() {
    try {
      setMessage("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setMessage(
        "Caméra active. Préparez-vous à cligner des yeux."
      );
    } catch (error) {
      console.error(error);
      setMessage(
        "Impossible d'ouvrir la caméra. Vérifiez les permissions du navigateur."
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setMessage("Caméra arrêtée.");
  }

  async function captureFrames() {
    if (!email.trim()) {
      setMessage("Saisissez l'adresse e-mail du compte.");
      return;
    }

    if (!videoRef.current || !cameraActive) {
      setMessage("Démarrez d'abord la caméra.");
      return;
    }

    setLoading(true);
    setMessage(
      "Capture en cours : gardez votre visage devant la caméra et clignez naturellement des yeux..."
    );

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (!canvas.width || !canvas.height) {
        throw new Error("La caméra n'est pas encore prête.");
      }

      const frames = [];

      // Capturer 15 images sur environ 3 secondes.
      for (let i = 0; i < 15; i++) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.85)
        );

        if (!blob) {
          throw new Error("Impossible de capturer une image.");
        }

        frames.push(blob);

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      const formData = new FormData();

      formData.append("email", email.trim());

      frames.forEach((frame, index) => {
        formData.append("frames", frame, `frame-${index + 1}.jpg`);
      });

      setMessage("Analyse du clignement et comparaison faciale...");

      const response = await fetch(
        `${API_URL}/auth/face/verify-live`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : "Erreur du serveur pendant la vérification."
        );
      }

      setMessage(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(error);
      setMessage(`Erreur : ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1>Authentification faciale</h1>
      <h2>Vérification du visage et du clignement</h2>

      <p>
        Saisissez l'adresse e-mail du compte associé au gabarit facial.
        Placez votre visage au centre de l'image et clignez naturellement
        des yeux pendant la capture.
      </p>

      <div className="form-group">
        <label htmlFor="email">Adresse e-mail du compte</label>

        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="exemple@email.com"
          autoComplete="email"
          required
          disabled={loading}
        />
      </div>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="webcam"
      />

      <div className="actions">
        {!cameraActive ? (
          <button onClick={startCamera} disabled={loading}>
            Démarrer la caméra
          </button>
        ) : (
          <button onClick={stopCamera} disabled={loading}>
            Arrêter la caméra
          </button>
        )}

        <button
          onClick={captureFrames}
          disabled={!cameraActive || loading}
        >
          {loading ? "Analyse en cours..." : "Vérifier mon visage"}
        </button>
      </div>

      {message && (
        <pre className="result" aria-live="polite">
          {message}
        </pre>
      )}
    </main>
  );
}

export default App;