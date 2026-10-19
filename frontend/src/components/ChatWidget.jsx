import { useState, useRef, useEffect, useCallback } from "react";
import "./ChatWidget.css";

const API_URL = "https://intelligent-document-extractor-api.onrender.com";

const QUICK_QUESTIONS = [
  "Comment extraire une facture ?",
  "Comment vérifier mon identité ?",
  "كيف أستخرج فاتورة؟",
  "ما هي صيغ الملفات المدعومة؟",
];

function TypingDots() {
  return (
    <div className="chat-typing-dots">
      <span />
      <span />
      <span />
    </div>
  );
}

export default function ChatWidget({ token, isAdmin }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: isAdmin
        ? "👋 Bonjour Administrateur ! Je suis votre assistant. Posez-moi vos questions sur la gestion des dossiers d'identité ou sur la plateforme.\n\nمرحباً! أنا مساعدك. كيف يمكنني مساعدتك؟"
        : "👋 Bonjour ! Je suis votre assistant intelligent. Posez-moi vos questions sur la plateforme.\n\nمرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك؟",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [playingMsgIndex, setPlayingMsgIndex] = useState(null);
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const audioRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Focus input when widget opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // Stop audio when widget closes
  useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingMsgIndex(null);
    }
  }, [open]);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text ?? input).trim();
      if (!trimmed || loading) return;

      const userMsg = { role: "user", content: trimmed };
      const newHistory = [...messages, userMsg];
      setMessages(newHistory);
      setInput("");
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`${API_URL}/chat/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: newHistory.slice(-20), // keep last 20 messages for context
            is_admin: !!isAdmin,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || `Erreur HTTP ${res.status}`);
        }

        const botMsg = { role: "assistant", content: data.reply };
        setMessages((prev) => [...prev, botMsg]);

        if (!open) {
          setUnreadCount((c) => c + 1);
        }
      } catch (err) {
        setError(err.message || "Erreur de communication avec l'assistant.");
      } finally {
        setLoading(false);
      }
    },
    [input, messages, loading, token, isAdmin, open]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const playTTS = async (text, msgIndex) => {
    // Toggle: if same message is playing, stop it
    if (playingMsgIndex === msgIndex && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingMsgIndex(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setPlayingMsgIndex(msgIndex);
    setTtsLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: text.slice(0, 1000) }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erreur TTS");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingMsgIndex(null);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setPlayingMsgIndex(null);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.error("[ChatWidget TTS]", err);
      setError(err.message || "Impossible de lire la réponse vocale.");
      setPlayingMsgIndex(null);
    } finally {
      setTtsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: isAdmin
          ? "👋 Bonjour Administrateur ! Je suis votre assistant. Posez-moi vos questions sur la gestion des dossiers d'identité ou sur la plateforme."
          : "👋 Bonjour ! Je suis votre assistant intelligent. Posez-moi vos questions sur la plateforme.",
      },
    ]);
    setError("");
    setInput("");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingMsgIndex(null);
  };

  return (
    <>
      {/* ── Floating bubble ── */}
      <button
        type="button"
        className={`chat-bubble-btn ${open ? "open" : ""} ${isAdmin ? "admin-theme" : ""}`}
        onClick={() => {
          if (!open) setUnreadCount(0);
          setOpen(!open);
        }}
        title="Assistant virtuel"
        aria-label="Ouvrir le chatbot"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
        {!open && unreadCount > 0 && (
          <span className="chat-unread-badge">{unreadCount}</span>
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div className={`chat-panel ${isAdmin ? "admin-theme" : ""}`}>
          {/* Header */}
          <div className="chat-panel-header">
            <div className="chat-header-info">
              <div className="chat-avatar-pulse">
                <span>{isAdmin ? "🛡️" : "🤖"}</span>
              </div>
              <div>
                <div className="chat-header-title">
                  {isAdmin ? "Assistant Admin" : "Assistant Intelligent"}
                </div>
                <div className="chat-header-status">
                  <span className="chat-status-dot" />
                  En ligne · FR / عربي
                </div>
              </div>
            </div>
            <div className="chat-header-actions">
              <button
                type="button"
                onClick={clearChat}
                title="Effacer la conversation"
                className="chat-icon-btn"
              >
                🗑️
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Fermer"
                className="chat-icon-btn"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-msg-row ${msg.role === "user" ? "user" : "bot"}`}
              >
                {msg.role === "assistant" && (
                  <div className="chat-bot-avatar">
                    {isAdmin ? "🛡️" : "🤖"}
                  </div>
                )}
                <div className="chat-bubble-wrap">
                  <div
                    className={`chat-bubble ${msg.role === "user" ? "user" : "bot"}`}
                  >
                    {msg.content}
                  </div>
                  {/* TTS button for bot messages */}
                  {msg.role === "assistant" && (
                    <button
                      type="button"
                      className={`chat-tts-btn ${playingMsgIndex === idx ? "playing" : ""}`}
                      onClick={() => playTTS(msg.content, idx)}
                      disabled={ttsLoading && playingMsgIndex !== idx}
                      title={
                        playingMsgIndex === idx
                          ? "Arrêter la lecture"
                          : "Lire à voix haute"
                      }
                    >
                      {ttsLoading && playingMsgIndex === idx
                        ? "⏳"
                        : playingMsgIndex === idx
                          ? "⏹️"
                          : "🔊"}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-msg-row bot">
                <div className="chat-bot-avatar">{isAdmin ? "🛡️" : "🤖"}</div>
                <div className="chat-bubble bot">
                  <TypingDots />
                </div>
              </div>
            )}

            {error && (
              <div className="chat-error-bar">
                ⚠️ {error}
                <button type="button" onClick={() => setError("")}>✕</button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions */}
          {messages.length <= 2 && (
            <div className="chat-quick-questions">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="chat-quick-pill"
                  onClick={() => sendMessage(q)}
                  disabled={loading}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="chat-input-area">
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="Posez votre question... / اكتب سؤالك هنا..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={800}
              disabled={loading}
            />
            <button
              type="button"
              className={`chat-send-btn ${loading ? "loading" : ""}`}
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              title="Envoyer (Entrée)"
            >
              {loading ? (
                <span className="chat-send-spinner" />
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                </svg>
              )}
            </button>
          </div>
          <div className="chat-footer-hint">
            Appuyez sur <kbd>Entrée</kbd> pour envoyer · <kbd>Maj+Entrée</kbd> pour sauter une ligne
          </div>
        </div>
      )}
    </>
  );
}
