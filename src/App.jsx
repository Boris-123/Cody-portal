// src/App.jsx
import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import CompanyLogo from "./assets/company-logo.png"; // adjust path if needed

export default function App() {
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    logout,
    error,
  } = useAuth0();

  if (isLoading) {
    return <div className="login‐container"><p>Loading…</p></div>;
  }
  if (error) {
    return (
      <div className="login‐container">
        <p style={{ color: "red" }}>Authentication Error: {error.message}</p>
      </div>
    );
  }

  // 1) Unauthenticated view:
  if (!isAuthenticated) {
    return (
      <div className="login‐container">
        <div className="login‐card">
          <img src={CompanyLogo} alt="Company Logo" />
          <h1>Welcome to Polaris</h1>
          <p>Securely log in to access our AI chat assistant.</p>
          <button
            className="login‐button"
            onClick={() => loginWithRedirect()}
          >
            Log In
          </button>
          <div className="login‐footer">
            © {new Date().getFullYear()} Polaris
          </div>
        </div>
      </div>
    );
  }

  // 2) Authenticated view:
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
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
        {/* Your Cody widget iframe */}
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
  );
}
