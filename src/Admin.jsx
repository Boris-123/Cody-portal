// src/Admin.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "./Admin.css";
import CompanyLogo from "./assets/logolatest.jpg";

/* ------------------ 组件 ------------------ */
export default function Admin() {
  const { logout } = useAuth0();

  /* ---------- State ---------- */
  const [events, setEvents] = useState([]);
  const [uniqueCount, setUniqueCount] = useState(0);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [errorEvents, setErrorEvents] = useState("");

  const [maxUsers, setMaxUsers] = useState("");
  const [loadingMax, setLoadingMax] = useState(false);
  const [savingMax, setSavingMax] = useState(false);
  const [errorMax, setErrorMax] = useState("");

  const [whitelist, setWhitelist] = useState([]);
  const [loadingWL, setLoadingWL] = useState(false);
  const [savingWL, setSavingWL] = useState(false);
  const [errorWL, setErrorWL] = useState("");
  const [newWLItem, setNewWLItem] = useState("");

  const [blocked, setBlocked] = useState([]);
  const [loadingBL, setLoadingBL] = useState(false);
  const [errorBL, setErrorBL] = useState("");
  const [unblockEmail, setUnblockEmail] = useState("");

  const [searchKeyword, setSearchKeyword] = useState("");

  /* ---------- Fetch helpers ---------- */
  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    setErrorEvents("");
    try {
      const r = await fetch("/api/admin-logins");
      if (!r.ok) throw new Error(r.status);
      const data = await r.json();
      setEvents(data);
      setUniqueCount(new Set(data.map((e) => e.email.split("@")[0])).size);
    } catch (err) {
      console.error(err);
      setErrorEvents("Failed to fetch login events.");
      setEvents([]);
      setUniqueCount(0);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const fetchMaxUsers = useCallback(async () => {
    setLoadingMax(true);
    setErrorMax("");
    try {
      const r = await fetch("/api/max-users");
      if (!r.ok) throw new Error(r.status);
      const body = await r.json();
      setMaxUsers(body.max.toString());
    } catch (err) {
      console.error(err);
      setErrorMax("Failed to fetch max-users.");
    } finally {
      setLoadingMax(false);
    }
  }, []);

  const fetchWhitelist = useCallback(async () => {
    setLoadingWL(true);
    setErrorWL("");
    try {
      const r = await fetch("/api/whitelist");
      if (!r.ok) throw new Error(r.status);
      const b = await r.json();
      setWhitelist(b.whitelist || []);
    } catch (err) {
      console.error(err);
      setErrorWL("Failed to fetch whitelist.");
    } finally {
      setLoadingWL(false);
    }
  }, []);

  const fetchBlocked = useCallback(async () => {
    setLoadingBL(true);
    setErrorBL("");
    try {
      const r = await fetch("/api/block-user"); // GET
      if (!r.ok) throw new Error(r.status);
      const b = await r.json();
      setBlocked(b.blocked || []);
    } catch (err) {
      console.error(err);
      setErrorBL("Failed to fetch blocked list.");
    } finally {
      setLoadingBL(false);
    }
  }, []);

  /* ---------- Effects ---------- */
  useEffect(() => {
    fetchEvents();
    fetchMaxUsers();
    fetchWhitelist();
    fetchBlocked();
  }, [fetchEvents, fetchMaxUsers, fetchWhitelist, fetchBlocked]);

  /* ---------- Mutations ---------- */
  const blockUser = async (email) => {
    if (!window.confirm(`Block "${email}"?`)) return;
    try {
      const r = await fetch("/api/block-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r.ok) throw new Error((await r.json()).error || r.status);
      await Promise.all([fetchEvents(), fetchBlocked()]);
    } catch (err) {
      console.error(err);
      setErrorEvents("Failed to block user.");
    }
  };

  const unblockUser = async (email) => {
    if (!window.confirm(`Unblock "${email}"?`)) return;
    try {
      const r = await fetch(`/api/block-user?email=${email}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error((await r.json()).error || r.status);
      await fetchBlocked();
    } catch (err) {
      console.error(err);
      setErrorBL("Failed to unblock user.");
    }
  };

  const saveMaxUsers = async () => {
    const val = parseInt(maxUsers, 10);
    if (isNaN(val) || val < 0) {
      setErrorMax("Enter non-negative integer.");
      return;
    }
    setSavingMax(true);
    try {
      const r = await fetch("/api/max-users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max: val }),
      });
      if (!r.ok) throw new Error((await r.json()).error || r.status);
      await fetchMaxUsers();
    } catch (err) {
      console.error(err);
      setErrorMax("Failed to save max-users.");
    } finally {
      setSavingMax(false);
    }
  };

  const saveWhitelist = async (arr) => {
    setSavingWL(true);
    try {
      const r = await fetch("/api/whitelist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whitelist: arr }),
      });
      if (!r.ok) throw new Error((await r.json()).error || r.status);
      await fetchWhitelist();
    } catch (err) {
      console.error(err);
      setErrorWL("Failed to update whitelist.");
    } finally {
      setSavingWL(false);
    }
  };

  /* ---------- Derived ---------- */
  const filteredEvents = events.filter((ev) =>
    ev.email
      .split("@")[0]
      .toLowerCase()
      .includes(searchKeyword.toLowerCase())
  );

  /* ---------- UI ---------- */
  return (
    <div className="admin-container">
      {/* Header */}
      <header className="admin-header">
        <div className="header-left">
          <img
            src={CompanyLogo}
            alt="Company Logo"
            className="header-logo"
            onClick={() => (window.location.href = "/")}
          />
          <h1 className="header-title">Polaris Admin Dashboard</h1>
        </div>
        <button
          className="btn-log-out"
          onClick={() => logout({ returnTo: window.location.origin })}
        >
          Log Out
        </button>
      </header>

      <main className="admin-main">
        {/* Error banners */}
        {errorEvents && <div className="alert-error">{errorEvents}</div>}
        {errorMax && <div className="alert-error">{errorMax}</div>}
        {errorWL && <div className="alert-error">{errorWL}</div>}
        {errorBL && <div className="alert-error">{errorBL}</div>}

        {/* 1. Current Login Events */}
        <section className="section-block">
          <h2 className="section-title">1. Current Login Events</h2>
          <p>
            Unique Users Logged In: <strong>{uniqueCount}</strong>
          </p>

          <div className="controls-row">
            <input
              type="text"
              placeholder="Search Username"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="search-input"
              disabled={loadingEvents}
            />
            <button
              className="btn-refresh"
              onClick={fetchEvents}
              disabled={loadingEvents}
            >
              {loadingEvents ? "Refreshing…" : "Refresh Now"}
            </button>
          </div>

          <div className="table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>When</th>
                  <th>IP</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="no-data-cell">
                      No login events.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((ev) => (
                    <tr key={ev._id}>
                      <td>{ev.email.split("@")[0]}</td>
                      <td>{ev.email}</td>
                      <td>
                        {new Date(ev.timestamp).toLocaleString([], {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td>{ev.location || "–"}</td>
                      <td>
                        <button
                          className="btn-remove-user"
                          onClick={() => blockUser(ev.email)}
                        >
                          Block
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Max-Users Limit */}
        <section className="section-block">
          <h2 className="section-title">2. Max-Users Limit</h2>
          <p>
            Set how many unique users can log in before new logins are blocked.
            <span className="sm-text">
              &nbsp;(Current Unique Count: {uniqueCount})
            </span>
          </p>
          <div className="controls-row">
            <input
              type="number"
              min="0"
              className="max-users-input"
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value)}
              disabled={loadingMax || savingMax}
            />
            <button
              className="btn-save"
              onClick={saveMaxUsers}
              disabled={loadingMax || savingMax}
            >
              {savingMax ? "Saving…" : loadingMax ? "Loading…" : "Save Limit"}
            </button>
          </div>
        </section>

        {/* 3. Whitelist Management */}
        <section className="section-block">
          <h2 className="section-title">3. Whitelist Management</h2>
          <p>Only these emails can access the admin dashboard.</p>

          {/* Add */}
          <div className="controls-row">
            <input
              type="email"
              placeholder="Enter admin email"
              className="whitelist-input"
              value={newWLItem}
              onChange={(e) => setNewWLItem(e.target.value)}
              disabled={loadingWL || savingWL}
            />
            <button
              className="btn-add"
              disabled={loadingWL || savingWL}
              onClick={async () => {
                const em = newWLItem.trim().toLowerCase();
                if (!em) return setErrorWL("Enter valid email.");
                if (whitelist.includes(em))
                  return setErrorWL("Already in whitelist.");
                await saveWhitelist([...whitelist, em]);
                setNewWLItem("");
              }}
            >
              {savingWL ? "Saving…" : "Add"}
            </button>
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="whitelist-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {whitelist.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="no-data-cell">
                      Empty.
                    </td>
                  </tr>
                ) : (
                  whitelist.map((e) => (
                    <tr key={e}>
                      <td>{e}</td>
                      <td>
                        <button
                          className="btn-remove-wl"
                          onClick={async () =>
                            saveWhitelist(whitelist.filter((x) => x !== e))
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Blocked Users */}
        <section className="section-block">
          <h2 className="section-title">4. Blocked Users</h2>
          <p>These emails cannot log in until unblocked.</p>

          {/* Quick Unblock by input */}
          <div className="controls-row">
            <input
              type="email"
              placeholder="Enter email to unblock"
              className="whitelist-input"
              value={unblockEmail}
              onChange={(e) => setUnblockEmail(e.target.value)}
              disabled={loadingBL}
            />
            <button
              className="btn-save"
              disabled={loadingBL || !unblockEmail.trim()}
              onClick={() => {
                const em = unblockEmail.trim().toLowerCase();
                if (!em) return;
                unblockUser(em).then(() => setUnblockEmail(""));
              }}
            >
              Unblock
            </button>
          </div>

          {/* Blocked list */}
          <div className="table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Blocked At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {blocked.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="no-data-cell">
                      No blocked users.
                    </td>
                  </tr>
                ) : (
                  blocked.map((e) => (
                    <tr key={e}>
                      <td>{e}</td>
                      <td>—</td>
                      <td>
                        <button
                          className="btn-unblock"
                          onClick={() => unblockUser(e)}
                        >
                          Unblock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
