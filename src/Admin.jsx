import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import CompanyLogo from "./assets/logolatest.jpg";
import "./Admin.css";

export default function Admin() {
  const { logout } = useAuth0();

  const [events, setEvents] = useState([]);
  const [loadingEv, setLoadingEv] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [auto, setAuto] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState([]);

  const fetchEvents = useCallback(async () => {
    setLoadingEv(true);
    try {
      const r = await fetch("/api/admin-logins");
      setEvents(r.ok ? await r.json() : []);
    } catch {
      setEvents([]);
    } finally {
      setLoadingEv(false);
    }
  }, []);

  const fetchBlockedUsers = useCallback(async () => {
    try {
      const r = await fetch("/api/blocked-users");
      const json = await r.json();
      setBlockedUsers(json.blocked || []);
    } catch {
      setBlockedUsers([]);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchBlockedUsers();
    if (!auto) return;
    const id = setInterval(() => {
      fetchEvents();
      fetchBlockedUsers();
    }, 30000);
    return () => clearInterval(id);
  }, [auto, fetchEvents, fetchBlockedUsers]);

  const grouped = useMemo(() => {
    const map = new Map();
    events.forEach((e) => {
      const key = e.email.toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return Array.from(map.entries()).map(([email, records]) => ({
      email,
      username: email.split("@")[0],
      lastLogin: records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0],
      all: records,
    }));
  }, [events]);

  const filteredGrouped = useMemo(() => {
    const s = search.toLowerCase();
    return grouped.filter((e) => {
      if (s && !e.username.toLowerCase().includes(s)) return false;
      if (dateFrom && new Date(e.lastLogin.timestamp) < new Date(dateFrom)) return false;
      if (dateTo && new Date(e.lastLogin.timestamp) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [grouped, search, dateFrom, dateTo]);

  const [expandedEmail, setExpandedEmail] = useState(null);

  const toggleExpand = (email) => {
    setExpandedEmail(expandedEmail === email ? null : email);
  };

  const exportCsv = () => {
    const rows = ["Username,Email,When,IP"];
    events.forEach((e) =>
      rows.push(
        `${e.email.split("@")[0]},${e.email},${new Date(
          e.timestamp
        ).toISOString()},${e.location || ""}`
      )
    );
    const url = URL.createObjectURL(
      new Blob([rows.join("\n")], { type: "text/csv" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `login-events-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [maxUsers, setMaxUsers] = useState("");
  const fetchMax = async () => {
    try {
      const r = await fetch("/api/max-users");
      setMaxUsers((await r.json()).max.toString());
    } catch {
      setMaxUsers("");
    }
  };
  useEffect(fetchMax, []);

  const [whitelist, setWhitelist] = useState([]);
  const fetchWL = async () => {
    try {
      const r = await fetch("/api/whitelist");
      setWhitelist((await r.json()).whitelist || []);
    } catch {
      setWhitelist([]);
    }
  };
  useEffect(fetchWL, []);

  const uniqueCnt = new Set(events.map((e) => e.email.split("@")[0])).size;

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="header-left" onClick={() => (window.location.href = "/")}>
          <img src={CompanyLogo} alt="" className="header-logo" />
          <h1 className="header-title">Polaris Admin Dashboard</h1>
        </div>
        <button
          className="btn btn-danger"
          onClick={() => logout({ returnTo: window.location.origin })}
        >
          Log Out
        </button>
      </header>

      <main className="admin-main">
        <section className="section-block">
          <h2 className="section-title">1. Current Login Events</h2>
          <p style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: ".9rem" }}>
            Unique Users Logged In: <strong>{uniqueCnt}</strong>
          </p>

          <div className="controls-row">
            <input
              className="input"
              placeholder="Search Username"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input
              type="date"
              className="input input-date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <input
              type="date"
              className="input input-date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <div style={{ display: "flex", gap: ".75rem" }}>
              <button className="btn btn-primary" onClick={fetchEvents} disabled={loadingEv}>
                {loadingEv ? "Loading…" : "Refresh"}
              </button>
              <button className="btn btn-secondary" onClick={exportCsv}>
                Export CSV
              </button>
            </div>
            <label className="autoref-label">
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
              />
              Auto refresh 30 s
            </label>
          </div>

          <div className="table-container">
            <table className="events-table" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Last Login</th>
                  <th>Last IP</th>
                  <th>Expand</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrouped.map((entry) => (
                  <React.Fragment key={entry.email}>
                    <tr>
                      <td>{entry.username}</td>
                      <td>{entry.email}</td>
                      <td>{new Date(entry.lastLogin.timestamp).toLocaleString()}</td>
                      <td>{entry.lastLogin.location || "–"}</td>
                      <td>
                        <button onClick={() => toggleExpand(entry.email)}>
                          {expandedEmail === entry.email ? "Hide" : "Show"}
                        </button>
                      </td>
                    </tr>
                    {expandedEmail === entry.email &&
                      entry.all.map((rec, i) => (
                        <tr key={rec._id || i} className="expand-row">
                          <td></td>
                          <td>{rec.email}</td>
                          <td>{new Date(rec.timestamp).toLocaleString()}</td>
                          <td>{rec.location || "–"}</td>
                          <td>
                            <button
                              className="btn-danger-small"
                              onClick={async () => {
                                await fetch("/api/block-user", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ email: rec.email }),
                                });
                                fetchEvents();
                                fetchBlockedUsers();
                              }}
                            >
                              Block
                            </button>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section-block">
          <h2 className="section-title">2. Blocked Users</h2>
          <div className="table-container">
            <table className="whitelist-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {blockedUsers.map((em) => (
                  <tr key={em}>
                    <td>{em}</td>
                    <td>
                      <button
                        className="btn-danger-small"
                        onClick={async () => {
                          await fetch("/api/unblock-user", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: em }),
                          });
                          fetchBlockedUsers();
                        }}
                      >
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section-block">
          <h2 className="section-title">3. Max-Users Limit</h2>
          <div className="controls-row">
            <input
              type="number"
              className="input"
              style={{ width: 120 }}
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={async () => {
                await fetch("/api/max-users", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ max: Number(maxUsers) }),
                });
                fetchMax();
              }}
            >
              Save
            </button>
          </div>
        </section>

        <section className="section-block">
          <h2 className="section-title">4. Whitelist</h2>
          <div className="table-container">
            <table className="whitelist-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {whitelist.map((em) => (
                  <tr key={em}>
                    <td>{em}</td>
                    <td>
                      <button
                        className="btn-danger-small"
                        onClick={async () => {
                          await fetch("/api/whitelist", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              whitelist: whitelist.filter((e) => e !== em),
                            }),
                          });
                          fetchWL();
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="controls-row" style={{ marginTop: ".6rem" }}>
            <input
              id="newWL"
              className="input"
              type="email"
              placeholder="new admin@example.com"
            />
            <button
              className="btn btn-primary"
              onClick={async () => {
                const v = document.getElementById("newWL").value.trim().toLowerCase();
                if (!v || whitelist.includes(v)) return;
                await fetch("/api/whitelist", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ whitelist: [...whitelist, v] }),
                });
                document.getElementById("newWL").value = "";
                fetchWL();
              }}
            >
              Add
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
