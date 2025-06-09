import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import CompanyLogo from "./assets/logolatest.jpg";
import "./Admin.css";

export default function Admin() {
  /* ========== Auth ========== */
  const { logout } = useAuth0();

  /* ========== Login events state ========== */
  const [events, setEvents] = useState([]);
  const [loadingEv, setLoadingEv] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rowsPerPage, setRows] = useState(10);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ col: "timestamp", asc: false });
  const [auto, setAuto] = useState(true);

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

  useEffect(() => {
    fetchEvents();
    if (!auto) return;
    const id = setInterval(fetchEvents, 30000);
    return () => clearInterval(id);
  }, [auto, fetchEvents]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return events
      .filter((e) => {
        if (s && !e.email.split("@")[0].toLowerCase().includes(s)) return false;
        if (dateFrom && new Date(e.timestamp) < new Date(dateFrom)) return false;
        if (dateTo && new Date(e.timestamp) > new Date(dateTo + "T23:59:59")) return false;
        return true;
      })
      .sort((a, b) => {
        const dir = sort.asc ? 1 : -1;
        if (sort.col === "username") return dir * a.email.localeCompare(b.email);
        if (sort.col === "ip") return dir * (a.location || "").localeCompare(b.location || "");
        return dir * (new Date(a.timestamp) - new Date(b.timestamp));
      });
  }, [events, search, dateFrom, dateTo, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const current = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const uniqueCnt = new Set(events.map((e) => e.email.split("@")[0])).size;
  const toggleSort = (col) =>
    setSort((s) => ({ col, asc: s.col === col ? !s.asc : true }));

  const exportCsv = () => {
    const rows = ["Username,Email,When,IP"];
    filtered.forEach((e) =>
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

  /* ========== Max-Users ========== */
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

  /* ========== Whitelist ========== */
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

  /* ========== Blocked ========== */
  const [blocked, setBlocked] = useState([]);
  const fetchBL = async () => {
    try {
      const r = await fetch("/api/block-user");
      setBlocked((await r.json()).blocked || []);
    } catch {
      setBlocked([]);
    }
  };
  useEffect(fetchBL, []);

  /* ------ column width style helpers ------ */
  const colUser = { width: "25%" };
  const colEmail = { width: "35%" };
  const colWhen = { width: "20%" };
  const colIP = { width: "15%" };
  const colAct = { width: 92, textAlign: "center" };

  /* ========== Render ========== */
  return (
    <div className="admin-container">
      {/* ── header ── */}
      <header className="admin-header">
        <div
          className="header-left"
          onClick={() => (window.location.href = "/")}
        >
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
        {/* 1 ─ Login events */}
        <section className="section-block">
          <h2 className="section-title">1. Current Login Events</h2>
          <p style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: ".9rem" }}>
            Unique Users Logged In: <strong>{uniqueCnt}</strong>
          </p>

          {/* toolbar */}
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
              <button
                className="btn btn-primary"
                onClick={fetchEvents}
                disabled={loadingEv}
              >
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

          {/* table */}
          <div className="table-container">
            <table className="events-table" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={colUser} onClick={() => toggleSort("username")}>
                    Username
                  </th>
                  <th style={colEmail}>Email</th>
                  <th style={colWhen} onClick={() => toggleSort("timestamp")}>
                    When
                  </th>
                  <th style={colIP} onClick={() => toggleSort("ip")}>
                    IP
                  </th>
                  <th style={colAct}>Action</th>
                </tr>
              </thead>
              <tbody>
                {current.map((e) => (
                  <tr key={e._id}>
                    <td style={colUser}>{e.email.split("@")[0]}</td>
                    <td style={colEmail}>{e.email}</td>
                    <td style={colWhen}>
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td style={colIP}>{e.location || "–"}</td>
                    <td style={colAct}>
                      <button
                        className="btn-danger-small"
                        onClick={async () => {
                          await fetch("/api/block-user", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: e.email }),
                          });
                          fetchEvents();
                          fetchBL();
                        }}
                      >
                        Block
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          <div className="pagination">
            <button onClick={() => setPage(1)} disabled={page === 1}>
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ‹ Prev
            </button>
            <span>
              {page}/{pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
            >
              Next ›
            </button>
            <button
              onClick={() => setPage(pageCount)}
              disabled={page === pageCount}
            >
              »
            </button>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRows(+e.target.value);
                setPage(1);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* 2 ─ Max-Users */}
        <section className="section-block">
          <h2 className="section-title">2. Max-Users Limit</h2>
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

        {/* 3 ─ Whitelist */}
        <section className="section-block">
          <h2 className="section-title">3. Whitelist</h2>
          <div className="table-container">
            <table className="whitelist-table" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={colEmail}>Email</th>
                  <th style={colAct}>Action</th>
                </tr>
              </thead>
              <tbody>
                {whitelist.map((em) => (
                  <tr key={em}>
                    <td style={colEmail}>{em}</td>
                    <td style={colAct}>
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

          {/* add */}
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
                const v = document
                  .getElementById("newWL")
                  .value.trim()
                  .toLowerCase();
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

        {/* 4 ─ Blocked */}
        <section className="section-block">
          <h2 className="section-title">4. Blocked Users</h2>
          <div className="table-container">
            <table className="events-table" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={colEmail}>Email</th>
                  <th style={colAct}>Action</th>
                </tr>
              </thead>
              <tbody>
                {blocked.map((em) => (
                  <tr key={em}>
                    <td style={colEmail}>{em}</td>
                    <td style={colAct}>
                      <button
                        className="btn-danger-small"
                        onClick={async () => {
                          await fetch("/api/block-user", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: em }),
                          });
                          fetchBL();
                        }}
                      >
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))}
                {blocked.length === 0 && (
                  <tr>
                    <td style={colEmail}>(None)</td>
                    <td style={colAct}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* manual block */}
          <div className="controls-row" style={{ marginTop: ".6rem" }}>
            <input
              id="newBL"
              className="input"
              type="email"
              placeholder="email to block"
            />
            <button
              className="btn btn-danger"
              onClick={async () => {
                const v = document
                  .getElementById("newBL")
                  .value.trim()
                  .toLowerCase();
                if (!v) return;
                await fetch("/api/block-user", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: v }),
                });
                document.getElementById("newBL").value = "";
                fetchBL();
              }}
            >
              Block
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
