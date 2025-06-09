import React, { useState, useRef, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import CompanyLogo from "./assets/logolatest.jpg";
import Admin from "./Admin";
import "./App.css";

/* =============================================================
   Chat UI helpers
   ===========================================================*/
function ChatBubble({ role, text }) {
  return (
    <div
      className={
        role === "user" ? "chat-bubble user-bubble" : "chat-bubble bot-bubble"
      }
    >
      {text}
    </div>
  );
}

function ChatPage({ user }) {
  const [messages, setMessages] = useState([]); // { role, text }
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [limitReached, setLimitReached] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const botId = import.meta.env.VITE_CODY_BOT_ID; // set in .env

  /* 自动滚动到底部 */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading || limitReached) return;
    const content = input.trim();
    setMessages((m) => [...m, { role: "user", text: content }]);
    setInput("");
    setLoading(true);
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          content,
          conversationId,
          botId,
        }),
      });
      if (resp.status === 403) {
        setLimitReached(true);
        const body = await resp.json();
        setMessages((m) => [...m, { role: "bot", text: body.error }]);
      } else {
        const body = await resp.json();
        setConversationId(body.conversationId);
        setMessages((m) => [...m, { role: "bot", text: body.reply.content }]);
      }
    } catch (err) {
      console.error(err);
      setMessages((m) => [...m, { role: "bot", text: "⚠️ Network error" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-wrapper">
      <div className="chat-history" ref={scrollRef}>
        {messages.map((msg, i) => (
          <ChatBubble key={i} role={msg.role} text={msg.text} />
        ))}
        {loading && <ChatBubble role="bot" text="…" />}
      </div>
      <div className="chat-input-row">
        <textarea
          className="chat-input"
          placeholder={limitReached ? "Credit exhausted" : "Type and press Enter"}
          value={input}
          disabled={limitReached}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="chat-send" disabled={limitReached || loading} onClick={send}>
          ➤
        </button>
      </div>
    </div>
  );
}

/* =============================================================
   Main App
   ===========================================================*/
export default function App() {
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    logout,
    error,
  } = useAuth0();

  if (isLoading) return <div className="login-container">Loading…</div>;
  if (error)
    return (
      <div className="login-container" style={{ color: "red" }}>
        Auth Error: {error.message}
      </div>
    );

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            !isAuthenticated ? (
              <div className="login-container">
                <div className="login-card">
                  <img src={CompanyLogo} alt="Logo" />
                  <h1>Welcome to Polaris</h1>
                  <p>Securely log in to access our AI assistant.</p>
                  <button className="login-button" onClick={() => loginWithRedirect()}>
                    Log In
                  </button>
                </div>
              </div>
            ) : (
              <div className="app-shell">
                <header className="app-header">
                  <div className="header-left">
                    <img src={CompanyLogo} alt="Logo" className="header-logo" />
                    <span className="bot-name">Polaris AI</span>
                  </div>
                  <div className="header-right">
                    <span className="user-name">{user.name}</span>
                    <button
                      className="btn-log-out"
                      onClick={() =>
                        logout({ logoutParams: { returnTo: window.location.origin } })
                      }
                    >
                      Log Out
                    </button>
                  </div>
                </header>
                <main className="app-main">
                  <ChatPage user={user} />
                </main>
              </div>
            )
          }
        />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
