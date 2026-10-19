import { useState, useRef, useEffect } from "react";
import "./AuthGateway.css";

export default function AuthGateway({
  apiUrl = "http://127.0.0.1:8000",
  onLoginSuccess,
}) {
  const [tab, setTab] = useState("face"); // "face" | "password" | "register"

  // Facial auth state
  const [faceEmail, setFaceEmail] = useState(
    () => localStorage.getItem("last_auth_email") || "anis2003@gmail.com"
  );
  const [cameraActive, setCameraActive] = useState(false);
  const [facialLoading, setFacialLoading] = useState(false);
  const [facialStatusText, setFacialStatusText] = useState("");
  const [facialError, setFacialError] = useState("");
  const [facialSuccess, setFacialSuccess] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Password / Register form states
  const [email, setEmail] = useState("anis@gmail.com");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [standardLoading, setStandardLoading] = useState(false);
  const [standardError, setStandardError] = useState("");
  const [standardSuccess, setStandardSuccess] = useState("");

  // Stop camera on unmount or tab switch away from face
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setFacialError("");
      setFacialStatusText("");

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
      setFacialStatusText("Caméra prête. Positionnez votre visage au centre du cadre.");
    } catch (err) {
      console.error(err);
      setFacialError("Impossible d'accéder à la caméra. Vérifiez les autorisations du navigateur.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Facial verification & automatic login
  const handleFacialLogin = async () => {
    if (!faceEmail.trim()) {
      setFacialError("Veuillez saisir l'adresse e-mail de votre compte.");
      return;
    }

    if (!videoRef.current || !cameraActive) {
      setFacialError("Activez d'abord la caméra.");
      return;
    }

    setFacialLoading(true);
    setFacialError("");
    setFacialStatusText("Analyse en cours : gardez votre visage dans le cadre et clignez naturellement des yeux...");

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const frames = [];

      for (let i = 0; i < 15; i++) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.85)
        );

        if (!blob) {
          throw new Error("Échec de capture d'image.");
        }

        frames.push(blob);
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      setFacialStatusText("Vérification du clignement et comparaison biométrique...");

      const formData = new FormData();
      formData.append("email", faceEmail.trim());

      frames.forEach((frame, idx) => {
        formData.append("frames", frame, `frame_${idx + 1}.jpg`);
      });

      const response = await fetch(`${apiUrl}/auth/face/verify-live`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Échec de l'authentification faciale.");
      }

      if (data.authenticated && data.access_token) {
        setFacialSuccess(true);
        setFacialStatusText("✓ Visage authentifié avec succès ! Connexion à l'application...");
        localStorage.setItem("last_auth_email", faceEmail.trim());

        stopCamera();

        // Small delay for smooth visual confirmation
        setTimeout(() => {
          onLoginSuccess(data.user, data.access_token);
        }, 600);
      } else {
        setFacialError(
          data.message ||
            "Visage non reconnu ou contrôles de vivacité non concluants. Veuillez réessayer."
        );
      }
    } catch (err) {
      setFacialError(err.message || "Erreur lors de l'authentification faciale.");
    } finally {
      setFacialLoading(false);
    }
  };

  // Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setStandardLoading(true);
    setStandardError("");
    setStandardSuccess("");

    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Email ou mot de passe incorrect.");
      }

      setStandardSuccess("Connexion réussie ! Redirection...");
      localStorage.setItem("last_auth_email", email.trim());

      setTimeout(() => {
        onLoginSuccess(data.user, data.access_token);
      }, 400);
    } catch (err) {
      setStandardError(err.message);
    } finally {
      setStandardLoading(false);
    }
  };

  // Register
  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStandardError("Les mots de passe ne correspondent pas.");
      return;
    }

    setStandardLoading(true);
    setStandardError("");
    setStandardSuccess("");

    try {
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Erreur lors de la création du compte.");
      }

      setStandardSuccess("Compte créé avec succès ! Connexion automatique...");
      localStorage.setItem("last_auth_email", email.trim());

      setTimeout(() => {
        onLoginSuccess(data.user, data.access_token);
      }, 500);
    } catch (err) {
      setStandardError(err.message);
    } finally {
      setStandardLoading(false);
    }
  };

  return (
    <div className="auth-gateway-container">
      <div className="auth-gateway-card">
        {/* Header */}
        <div className="auth-gateway-header">
          <div className="auth-gateway-logo">📄</div>
          <h1>Intelligent Document Extractor</h1>
          <p>Connectez-vous pour extraire et enregistrer vos factures</p>
        </div>

        {/* Tab Selector */}
        <div className="auth-tabs-nav">
          <button
            type="button"
            className={`auth-tab-btn ${tab === "face" ? "active" : ""}`}
            onClick={() => {
              setTab("face");
              setStandardError("");
            }}
          >
            <span>👁️</span>
            <span>Visage automatique</span>
          </button>

          <button
            type="button"
            className={`auth-tab-btn ${tab === "password" ? "active" : ""}`}
            onClick={() => {
              setTab("password");
              stopCamera();
              setFacialError("");
            }}
          >
            <span>🔑</span>
            <span>Mot de passe</span>
          </button>

          <button
            type="button"
            className={`auth-tab-btn ${tab === "register" ? "active" : ""}`}
            onClick={() => {
              setTab("register");
              stopCamera();
              setFacialError("");
            }}
          >
            <span>📝</span>
            <span>Inscription</span>
          </button>
        </div>

        {/* Gateway Content */}
        <div className="auth-gateway-body">
          {/* TAB 1: FACIAL RECOGNITION AUTO-LOGIN */}
          {tab === "face" && (
            <div className="facial-auth-box">
              <div className="auth-input-group" style={{ width: "100%" }}>
                <label htmlFor="facial-email">E-mail du compte à authentifier :</label>
                <input
                  id="facial-email"
                  type="email"
                  value={faceEmail}
                  onChange={(e) => setFaceEmail(e.target.value)}
                  placeholder="exemple@email.com"
                  disabled={facialLoading}
                  required
                />
              </div>

              {/* Camera Frame */}
              <div className="facial-camera-viewport">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="facial-camera-video"
                  style={{ display: cameraActive ? "block" : "none" }}
                />

                <div
                  className={`face-oval-guide ${cameraActive ? "active" : ""}`}
                />

                {!cameraActive && (
                  <div className="camera-inactive-placeholder">
                    <span style={{ fontSize: "2.5rem" }}>📷</span>
                    <span style={{ fontSize: "0.9rem" }}>Caméra actuellement inactive</span>
                    <button
                      type="button"
                      className="btn-camera-toggle"
                      onClick={startCamera}
                    >
                      Démarrer la caméra
                    </button>
                  </div>
                )}
              </div>

              {cameraActive && (
                <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                  <button
                    type="button"
                    className="btn-primary-auth"
                    onClick={handleFacialLogin}
                    disabled={facialLoading}
                  >
                    <span>{facialLoading ? "⏳" : "👁️"}</span>
                    <span>
                      {facialLoading ? "Vérification..." : "Vérifier et me connecter"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="btn-camera-toggle"
                    onClick={stopCamera}
                    disabled={facialLoading}
                  >
                    Arrêter
                  </button>
                </div>
              )}

              {facialStatusText && !facialError && (
                <div
                  className={`auth-alert-message ${
                    facialSuccess ? "success" : "info"
                  }`}
                >
                  {facialStatusText}
                </div>
              )}

              {facialError && (
                <div className="auth-alert-message error">
                  {facialError}
                </div>
              )}

              <div className="auth-demo-tip">
                💡 <strong>Astuce :</strong> Le compte <code>anis2003@gmail.com</code> possède un gabarit facial enregistré. Placez votre visage dans l'ovale et clignez des yeux.
              </div>
            </div>
          )}

          {/* TAB 2: PASSWORD LOGIN */}
          {tab === "password" && (
            <form className="auth-form" onSubmit={handlePasswordLogin}>
              <div className="auth-input-group">
                <label htmlFor="login-email">Adresse e-mail :</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@domaine.com"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="auth-input-group">
                <label htmlFor="login-pwd">Mot de passe :</label>
                <input
                  id="login-pwd"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              {standardError && (
                <div className="auth-alert-message error">{standardError}</div>
              )}

              {standardSuccess && (
                <div className="auth-alert-message success">{standardSuccess}</div>
              )}

              <button
                type="submit"
                className="btn-primary-auth"
                disabled={standardLoading}
              >
                {standardLoading ? "Connexion..." : "Se connecter"}
              </button>

              <div className="auth-demo-tip">
                Pour l'administration complète : <code>anis@gmail.com</code>
              </div>
            </form>
          )}

          {/* TAB 3: REGISTER */}
          {tab === "register" && (
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="auth-input-group">
                <label htmlFor="reg-email">Adresse e-mail :</label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  required
                />
              </div>

              <div className="auth-input-group">
                <label htmlFor="reg-pwd">Mot de passe :</label>
                <input
                  id="reg-pwd"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  required
                />
              </div>

              <div className="auth-input-group">
                <label htmlFor="reg-pwd-confirm">Confirmer le mot de passe :</label>
                <input
                  id="reg-pwd-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  required
                />
              </div>

              {standardError && (
                <div className="auth-alert-message error">{standardError}</div>
              )}

              {standardSuccess && (
                <div className="auth-alert-message success">{standardSuccess}</div>
              )}

              <button
                type="submit"
                className="btn-primary-auth"
                disabled={standardLoading}
              >
                {standardLoading ? "Création du compte..." : "Créer mon compte"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
