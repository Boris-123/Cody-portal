// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

import CompanyLogo from "./assets/logolatest.jpg";
import Admin from "./Admin";
import "./App.css"; // 确保引入了上面提到的 .login-container、.login-card 等样式

export default function App() {
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    logout,
    error,
  } = useAuth0();

  useEffect(() => {
    const trackLogin = async () => {
      if (!isAuthenticated || !user) return;

      const res = await fetch("/api/track-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          userId: user.sub,
          when: new Date().toISOString(),
        }),
      });

      if (res.status === 403) {
        const msg = await res.json();
        alert(msg.error || "Access denied. You have been blocked or max users exceeded.");
        window.location.href = "/api/auth/logout"; // 🔁 Logs out immediately
      }
    };
    trackLogin();
  }, [isAuthenticated, user]);
  
  // 🔼 🔼 🔼 END OF useEffect INSERT
  // 1. 正在加载
  if (isLoading) {
    return (
      <div className="login-container">
        <p>Loading…</p>
      </div>
    );
  }

  // 2. Auth0 错误
  if (error) {
    return (
      <div className="login-container" style={{ color: "red" }}>
        Authentication Error: {error.message}
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/*
          根路径 "/"：
            - 未登录（!isAuthenticated）时，渲染原先放在“login-container / login-card”里的内容
            - 已登录（isAuthenticated）时，渲染主界面（Header + iframe）
        */}
        <Route
          path="/"
          element={
            !isAuthenticated ? (
              /* —— 登录视图 START —— */
              <div className="login-container">
                <div className="login-card">
                  {/* LOGO 保持原先大小 */}
                  <img src={CompanyLogo} alt="Company Logo" />
                  <h1>Welcome to Polaris</h1>
                  <p>Securely log in to access our AI chat assistant.</p>
                  <button
                    className="login-button"
                    onClick={() => loginWithRedirect()}
                  >
                    Log In
                  </button>
                  <div style={{ marginTop: "1rem", color: "#9ca3af", fontSize: "0.875rem" }}>
                    © 2025 Polaris
                  </div>
                </div>
              </div>
              /* —— 登录视图 END —— */
            ) : (
              /* —— 已登录视图 START —— */
              <div
                style={{
                  height: "100vh",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <header
                  style={{
                    backgroundColor: "#1f2937",
                    color: "white",
                    padding: "1rem 2rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>Hello, {user.name}</strong>
                  </div>
                  <button
                    style={{
                      backgroundColor: "#e53e3e",
                      color: "white",
                      border: "none",
                      padding: "0.5rem 1rem",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      logout({ logoutParams: { returnTo: window.location.origin } })
                    }
                  >
                    Log Out
                  </button>
                </header>
                <main style={{ flex: 1, padding: "1rem" }}>
                  <iframe
                    title="Cody Chat"
                    src="https://embed.cody.bot/9edc7c13-386b-4271-bd76-6b55ccc036ef"
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                </main>
              </div>
              /* —— 已登录视图 END —— */
            )
          }
        />

        {/*
          访问 "/admin" 时，渲染你当前写好的 Admin.jsx，
          暂时不做角色校验，后续再加入。
        */}
        <Route path="/admin" element={<Admin />} />

        {/* 其他路径都跳回 "/" */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
