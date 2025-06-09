import React, { useState, useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import CompanyLogo from "./assets/company-logo.png";
import "./Admin.css";

/* =============================================
   Polaris Admin Dashboard (Router‑free version)
   — fixes “Router inside Router” error
   — Features: search + pagination, Max‑Users, Whitelist, Block list
   ============================================= */

export default function Admin() {
  const { logout } = useAuth0();

  /* ---------- 登录事件 ---------- */
  const [events, setEvents] = useState([]);
  const [loadingEv, setLoadingEv] = useState(false);
  const [errorEv, setErrorEv] = useState("");
  const [search, setSearch] = useState("");

  /* 分页 */
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(events.length / rowsPerPage));
  const pagedEvents = events.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const fetchEvents = useCallback(async () => {
    setLoadingEv(true);
    setErrorEv("");
    try {
      const r = await fetch("/api/admin-logins");
      if (!r.ok) throw new Error(r.status);
      const data = await r.json();
      setEvents(data);
      setPage(1);
    } catch (err) {
      setErrorEv("Failed to load events");
      setEvents([]);
    } finally {
      setLoadingEv(false);
    }
  }, []);

  /* ---------- Max‑Users ---------- */
  const [maxUsers, setMaxUsers] = useState("");
  const [loadingMax, setLoadingMax] = useState(false);
  const fetchMax = useCallback(async () => {
    setLoadingMax(true);
    try {
      const r = await fetch("/api/max-users");
      if (!r.ok) throw new Error();
      const b = await r.json();
      setMaxUsers(b.max.toString());
    } catch {
      setMaxUsers("");
    } finally {
      setLoadingMax(false);
    }
  }, []);

  /* ---------- Whitelist ---------- */
  const [whitelist, setWhitelist] = useState([]);
  const fetchWL = useCallback(async () => {
    try {
      const r = await fetch("/api/whitelist");
      if (!r.ok) throw new Error();
      const b = await r.json();
      setWhitelist(b.whitelist || []);
    } catch {
      setWhitelist([]);
    }
  }, []);

  /* ---------- Blocked ---------- */
  const [blocked, setBlocked] = useState([]);
  const fetchBL = useCallback(async () => {
    try {
      const r = await fetch("/api/block-user");
      if (!r.ok) throw new Error();
      const b = await r.json();
      setBlocked(b.blocked || []);
    } catch {
      setBlocked([]);
    }
  }, []);

  /* ---------- 卸载后的首次加载 ---------- */
  useEffect(() => {
    fetchEvents();
    fetchMax();
    fetchWL();
    fetchBL();
  }, [fetchEvents, fetchMax, fetchWL, fetchBL]);

  /* ---------- 渲染 ---------- */
  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="header-left">
          <img src={CompanyLogo} alt="Logo" className="header-logo" onClick={() => (window.location.href = "/")} />
          <h1 className="header-title">Polaris Admin Dashboard</h1>
        </div>
        <button className="btn-log-out" onClick={() => logout({ returnTo: window.location.origin })}>
          Log Out
        </button>
      </header>

      <main className="admin-main">
        {errorEv && <div className="alert-error">{errorEv}</div>}

        {/* 1. Login Events */}
        <section className="section-block">
          <h2 className="section-title">1. Current Login Events</h2>
          <div className="controls-row">
            <input
              type="text"
              className="search-input"
              placeholder="Search Username"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn-refresh" onClick={fetchEvents} disabled={loadingEv}>
              {loadingEv ? "Loading…" : "Refresh"}
            </button>
          </div>

          <div className="table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Username</th><th>Email</th><th>When</th><th>IP</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedEvents.filter(ev => ev.email.split("@")[0].includes(search)).map(ev => (
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

          {/* Pagination */}
          <div className="pagination">
            <button onClick={() => setPage(1)} disabled={page === 1}>«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
            <span>{page}/{pageCount}</span>
            <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount}>Next ›</button>
            <button onClick={() => setPage(pageCount)} disabled={page === pageCount}>»</button>
            <select value={rowsPerPage} onChange={e => {setRowsPerPage(+e.target.value); setPage(1);}}>
              {[10,25,50].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
          </div>
        </section>

        {/* 2. Max‑Users */}
        <section className="section-block">
          <h2 className="section-title">2. Max‑Users Limit</h2>
          <div className="controls-row">
            <input type="number" className="max-users-input" value={maxUsers} onChange={(e)=>setMaxUsers(e.target.value)} />
            <button className="btn-save" onClick={async()=>{
              await fetch("/api/max-users",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({max:Number(maxUsers)})});
              fetchMax();
            }}>Save</button>
          </div>
        </section>

        {/* 3. Whitelist */}
        <section className="section-block">
          <h2 className="section-title">3. Whitelist</h2>
          <div className="table-container">
            <table className="whitelist-table">
              <thead><tr><th>Email</th><th>Action</th></tr></thead>
              <tbody>
                {whitelist.map(email=> (
                  <tr key={email}><td>{email}</td><td>
                    <button className="btn-remove-wl" onClick={async()=>{
                      await fetch("/api/whitelist",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({whitelist:whitelist.filter(e=>e!==email)})});
                      fetchWL();
                    }}>Remove</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="controls-row" style={{marginTop:"0.5rem"}}>
            <input type="email" className="whitelist-input" placeholder="new admin@example.com" id="newWl" />
            <button className="btn-add" onClick={async()=>{
              const val=document.getElementById("newWl").value.trim().toLowerCase();
              if(!val) return;
              await fetch("/api/whitelist",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({whitelist:[...whitelist,val]})});
              document.getElementById("newWl").value="";
              fetchWL();
            }}>Add</button>
          </div>
        </section>

        {/* 4. Blocked Users */}
        <section className="section-block">
          <h2 className="section-title">4. Blocked Users</h2>
          <div className="table-container">
            <table className="events-table"><thead><tr><th>Email</th><th>Action</th></tr></thead><tbody>
              {blocked.map(e=> (
                <tr key={e}><td>{e}</td><td><button className="btn-unblock" onClick={async()=>{await fetch(`/api/block-user?email=${e}`,{method:"DELETE"});fetchBL();fetchEvents();}}>Unblock</button></td></tr>
              ))}
            </tbody></table>
          </div>
        </section>
      </main>
    </div>
  );
}
