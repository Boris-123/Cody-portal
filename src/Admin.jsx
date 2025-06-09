import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import CompanyLogo from "./assets/logolatest.jpg";
import "./Admin.css";

/* ──────────────────────────────────────────────────────────
   Polaris Admin Dashboard · refined UI (2025‑06)
   ──────────────────────────────────────────────────────────
   ✓ Search + sortable columns + pagination (10/25/50/100)
   ✓ Unique‑user counter
   ✓ Date‑range filter
   ✓ Auto‑refresh toggle (30 s)
   ✓ CSV export (current view)
   ✓ Max‑Users limit (PUT /api/max-users)
   ✓ Whitelist CRUD (PUT /api/whitelist)
   ✓ Block list CRUD (POST / DELETE /api/block-user)
   ──────────────────────────────────────────────────────────*/

export default function Admin() {
  /* ================= Auth ================= */
  const { logout } = useAuth0();

  /* ================= state – login events ================= */
  const [events, setEvents] = useState([]);
  const [loadingEv, setLoadingEv] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ col: "timestamp", asc: false });
  const [auto, setAuto] = useState(true);

  /* ---- fetch login events ---- */
  const fetchEvents = useCallback(async () => {
    setLoadingEv(true);
    try {
      const r = await fetch("/api/admin-logins");
      if (!r.ok) throw new Error();
      setEvents(await r.json());
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
  }, [fetchEvents, auto]);

  /* ---- derived list ---- */
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return events
      .filter((e) => {
        const uname = e.email.split("@")[0].toLowerCase();
        if (s && !uname.includes(s)) return false;
        if (dateFrom && new Date(e.timestamp) < new Date(dateFrom)) return false;
        if (dateTo && new Date(e.timestamp) > new Date(dateTo + "T23:59:59")) return false;
        return true;
      })
      .sort((a, b) => {
        const dir = sort.asc ? 1 : -1;
        switch (sort.col) {
          case "username":
            return dir * a.email.localeCompare(b.email);
          case "ip":
            return dir * (a.location || "").localeCompare(b.location || "");
          default:
            return dir * (new Date(a.timestamp) - new Date(b.timestamp));
        }
      });
  }, [events, search, dateFrom, dateTo, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageSlice = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const uniqueCount = new Set(events.map((e) => e.email.split("@")[0])).size;

  /* ---- CSV export ---- */
  const exportCsv = () => {
    const rows = ["Username,Email,When,IP"];
    filtered.forEach((e) => rows.push(`${e.email.split("@")[0]},${e.email},${new Date(e.timestamp).toISOString()},${e.location || ""}`));
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `login-events-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  /* ================= Max‑Users ================= */
  const [maxUsers, setMaxUsers] = useState("");
  const fetchMax = async () => {
    try {
      const r = await fetch("/api/max-users");
      const b = await r.json();
      setMaxUsers(b.max.toString());
    } catch { setMaxUsers(""); }
  };
  useEffect(fetchMax, []);

  /* ================= Whitelist ================= */
  const [whitelist, setWhitelist] = useState([]);
  const fetchWL = async () => {
    try { const r = await fetch("/api/whitelist"); setWhitelist((await r.json()).whitelist || []); } catch { setWhitelist([]); }
  };
  useEffect(fetchWL, []);

  /* ================= Blocked ================= */
  const [blocked, setBlocked] = useState([]);
  const fetchBL = async () => {
    try { const r = await fetch("/api/block-user"); setBlocked((await r.json()).blocked || []); } catch { setBlocked([]); }
  };
  useEffect(fetchBL, []);

  /* ================= helpers ================= */
  const sortCol = (col) => setSort((s) => ({ col, asc: s.col === col ? !s.asc : true }));

  /* ================= render ================= */
  return (
    <div className="admin-container">
      {/* header */}
      <header className="admin-header">
        <div className="header-left" onClick={() => (window.location.href = "/")}> 
          <img src={CompanyLogo} alt="logo" className="header-logo" />
          <h1 className="header-title">Polaris Admin Dashboard</h1>
        </div>
        <button className="btn-log-out" onClick={() => logout({ returnTo: window.location.origin })}>Log Out</button>
      </header>

      <main className="admin-main">
        {/* ─────────────── 1. login events */}
        <section className="section-block">
          <h2 className="section-title">1. Current Login Events</h2>
          <p className="sm-text">Unique Users Logged In: <strong>{uniqueCount}</strong></p>

          <div className="controls-row">
            <input className="search-input" placeholder="Search Username" value={search} onChange={(e) => setSearch(e.target.value)} />
            <input type="date" className="input-date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <input type="date" className="input-date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

            <div className="flex-center gap-3">
              <button className="btn-refresh" onClick={fetchEvents} disabled={loadingEv}>{loadingEv ? "Loading…" : "Refresh"}</button>
              <button className="btn-export" onClick={exportCsv}>Export CSV</button>
            </div>

            <label className="autoref-label">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto refresh 30 s
            </label>
          </div>

          {/* table */}
          <div className="table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th onClick={() => sortCol("username")} style={{ cursor: "pointer" }}>Username</th>
                  <th>Email</th>
                  <th onClick={() => sortCol("timestamp")} style={{ cursor: "pointer" }}>When</th>
                  <th onClick={() => sortCol("ip")} style={{ cursor: "pointer" }}>IP</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pageSlice.map((ev) => (
                  <tr key={ev._id}>
                    <td>{ev.email.split("@")[0]}</td>
                    <td>{ev.email}</td>
                    <td>{new Date(ev.timestamp).toLocaleString()}</td>
                    <td>{ev.location || "–"}</td>
                    <td>
                      <button className="btn-remove-user" onClick={async () => {
                        await fetch("/api/block-user", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: ev.email }),
                        });
                        fetchEvents();
                        fetchBL();
                      }}>Block</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          <div className="pagination">
            <button onClick={() => setPage(1)} disabled={page === 1}>«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
            <span>{page}/{pageCount}</span>
            <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}>Next ›</button>
            <button onClick={() => setPage(pageCount)} disabled={page === pageCount}>»</button>
            <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(+e.target.value); setPage(1); }}>
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}/page</option>)}
            </select>
          </div>
        </section>

        {/* ─────────────── 2. Max‑Users */}
        <section className="section-block">
          <h2 className="section-title">2. Max‑Users Limit</h2>
          <div className="controls-row">
            <input type="number" className="max-users-input" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} />
            <button className="btn-save" style={{ marginLeft: ".75rem" }} onClick={async () => {
              await fetch("/api/max-users", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ max: Number(maxUsers) }),
              });
              fetchMax();
            }}>Save</button>
          </div>
        </section>

        {/* ─────────────── 3. Whitelist */}
        <section className="section-block">
          <h2 className="section-title">3. Whitelist</h2>
          <div className="table-container"><table className="whitelist-table"><thead><tr><th>Email</th><th>Action</th></tr></thead><tbody>
            {whitelist.map((em) => <tr key={em}><td>{em}</td><td><button className="btn-remove-wl" onClick={async () => {
              await fetch("/api/whitelist", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ whitelist: whitelist.filter((e) => e !== em) }),
              });
              fetchWL();
            }}>Remove</button></td></tr>)}
          </tbody></table></div>
          <div className="controls-row" style={{ marginTop: ".6rem" }}>
            <input id="newWL" className="whitelist-input" type="email" placeholder="new admin@example.com" />
            <button className="btn-add" onClick={async () => {
              const val = document.getElementById("newWL").value.trim().toLowerCase();
              if (!val || whitelist.includes(val)) return;
              await fetch("/api/whitelist", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ whitelist: [...whitelist, val] }),
              });
              document.getElementById("newWL").value = "";
              fetchWL();
            }}>Add</button>
          </div>
        </section>

        {/* ─────────────── 4. Blocked list */}
        <section className="section-block">
          <h2 className="section-title">4. Blocked Users</h2>
          <div className="table-container"><table className="events-table"><thead><tr><th>Email</th><th>Action</th></tr></thead><tbody>
            {blocked.map((em) => <tr key={em}><td>{em}</td><td><button className="btn-unblock" onClick={async () => {
              await fetch(`/api/block-user?email=${encodeURIComponent(em)}`, { method: "DELETE" });
              fetchBL();
              fetchEvents();
            }}>Unblock</button></td></tr>)}
          </tbody></table></div>
        </section>
      </main>
    </div>
  );
}
