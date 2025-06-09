import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import CompanyLogo from "./assets/logolatest.jpg"; // correct logo
import "./Admin.css";

/* ===========================================================
   Polaris Admin Dashboard – fully‑featured version
   -----------------------------------------------------------
   • Search + pagination + sortable columns
   • Unique‑Users counter (real‑time)
   • Auto‑refresh every 30 s (toggle)
   • CSV export (current filter)
   • Date‑range filter (optional)
   • Max‑Users limit, Whitelist CRUD, Block list CRUD
   • No nested Router
   =========================================================== */

export default function Admin() {
  const { logout } = useAuth0();

  /* ---------- Login events ---------- */
  const [events, setEvents] = useState([]);
  const [loadingEv, setLoadingEv] = useState(false);
  const [errorEv, setErrorEv] = useState("");
  const [search, setSearch] = useState("");

  /* date range */
  const [dateFrom, setDateFrom] = useState(""); // YYYY‑MM‑DD
  const [dateTo, setDateTo] = useState("");

  /* pagination */
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  /* sorting */
  const [sort, setSort] = useState({ col: "timestamp", asc: false });

  /* auto‑refresh */
  const [auto, setAuto] = useState(true);

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

  /* auto refresh every 30 s */
  useEffect(() => {
    fetchEvents();
    if (!auto) return;
    const id = setInterval(fetchEvents, 30000);
    return () => clearInterval(id);
  }, [fetchEvents, auto]);

  /* ---- derived: filtered + sorted ---- */
  const filtered = useMemo(() => {
    return events
      .filter((ev) => {
        const uname = ev.email.split("@")[0].toLowerCase();
        if (!uname.includes(search.toLowerCase())) return false;
        if (dateFrom && new Date(ev.timestamp) < new Date(dateFrom)) return false;
        if (dateTo && new Date(ev.timestamp) > new Date(dateTo + "T23:59:59")) return false;
        return true;
      })
      .sort((a, b) => {
        const dir = sort.asc ? 1 : -1;
        if (sort.col === "username") return dir * a.email.localeCompare(b.email);
        if (sort.col === "ip") return dir * (a.location || "").localeCompare(b.location || "");
        return dir * (new Date(a.timestamp) - new Date(b.timestamp));
      });
  }, [events, search, dateFrom, dateTo, sort]);

  /* pagination slice */
  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pagedEvents = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  /* unique count */
  const uniqueCount = new Set(events.map((e) => e.email.split("@")[0])).size;

  /* CSV export */
  const exportCsv = () => {
    const rows = ["Username,Email,When,IP"];
    filtered.forEach((ev) => {
      rows.push(
        `${ev.email.split("@")[0]},${ev.email},${new Date(ev.timestamp).toISOString()},${ev.location || ""}`
      );
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `login-events-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- Max‑Users ---------- */
  const [maxUsers, setMaxUsers] = useState("");
  const fetchMax = useCallback(async () => {
    try {
      const r = await fetch("/api/max-users");
      if (!r.ok) throw new Error();
      const b = await r.json();
      setMaxUsers(b.max.toString());
    } catch {
      setMaxUsers("");
    }
  }, []);
  useEffect(fetchMax, [fetchMax]);

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
  useEffect(fetchWL, [fetchWL]);

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
  useEffect(fetchBL, [fetchBL]);

  /* ---------- Render ---------- */
  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="header-left" onClick={() => (window.location.href = "/")}> 
          <img src={CompanyLogo} alt="Logo" className="header-logo" />
          <h1 className="header-title">Polaris Admin Dashboard</h1>
        </div>
        <button className="btn-log-out" onClick={() => logout({ returnTo: window.location.origin })}>Log Out</button>
      </header>

      <main className="admin-main">
        {errorEv && <div className="alert-error">{errorEv}</div>}

        {/* 1. Login events */}
        <section className="section-block">
          <h2 className="section-title">1. Current Login Events</h2>
          <p style={{ fontSize: "0.9rem", marginTop: 0 }}>
            Unique Users Logged In: <strong>{uniqueCount}</strong>
          </p>
          <div className="controls-row" style={{ flexWrap: "wrap" }}>
            <input className="search-input" placeholder="Search Username" value={search} onChange={(e) => setSearch(e.target.value)} />
            <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} style={{marginRight:"0.5rem"}}/>
            <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} style={{marginRight:"0.5rem"}}/>
            <button className="btn-refresh" onClick={fetchEvents} disabled={loadingEv}>{loadingEv ? "Loading…" : "Refresh"}</button>
            <button className="btn-save" onClick={exportCsv}>Export CSV</button>
            <label style={{marginLeft:"auto",fontSize:"0.85rem"}}>
              <input type="checkbox" checked={auto} onChange={(e)=>setAuto(e.target.checked)} /> Auto refresh 30 s
            </label>
          </div>

          <div className="table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th onClick={()=>setSort({col:"username",asc:sort.col==="username"?!sort.asc:true})} style={{cursor:"pointer"}}>Username</th>
                  <th>Email</th>
                  <th onClick={()=>setSort({col:"timestamp",asc:sort.col==="timestamp"?!sort.asc:true})} style={{cursor:"pointer"}}>When</th>
                  <th onClick={()=>setSort({col:"ip",asc:sort.col==="ip"?!sort.asc:true})} style={{cursor:"pointer"}}>IP</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedEvents.map((ev) => (
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
            <button onClick={()=>setPage(1)} disabled={page===1}>«</button>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹ Prev</button>
            <span>{page}/{pageCount}</span>
            <button onClick={()=>setPage(p=>Math.min(pageCount,p+1))} disabled={page===pageCount}>Next ›</button>
            <button onClick={()=>setPage(pageCount)} disabled={page===pageCount}>»</button>
            <select value={rowsPerPage} onChange={(e)=>{setRowsPerPage(+e.target.value);setPage(1);}}>
              {[10,25,50].map(n=>(<option key={n} value={n}>{n}/page</option>))}
            </select>
          </div>
        </section>

        {/* 2. Max‑Users */}
        <section className="section-block">
          <h2 className="section-title">2. Max‑Users Limit</h2>
          <div className="controls-row">
            <input type="number" className="max-users-input" value={maxUsers} onChange={(e)=>setMaxUsers(e.target.value)} />
            <button className="btn-save" onClick={async()=>{await fetch("/api/max-users",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({max:Number(maxUsers)})});fetchMax();}}>Save</button>
          </div>
        </section>

        {/* 3. Whitelist */}
        <section className="section-block">
          <h2 className="section-title">3. Whitelist</h2>
          <div className="table-container">
            <table className="whitelist-table"><thead><tr><th>Email</th><th>Action</th></tr></thead><tbody>
              {whitelist.map(email=> (
                <tr key={email}><td>{email}</td><td><button className="btn-remove-wl" onClick={async()=>{
                  await fetch("/api/whitelist",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({whitelist:whitelist.filter(e=>e!==email)})});fetchWL();}}>Remove</button></td></tr>
              ))}
            </tbody></table>
          </div>
          <div className="controls-row" style={{marginTop:"0.5rem"}}>
            <input type="email" className="whitelist-input" placeholder="new admin@example.com" id="newWl" />
            <button className="btn-add" onClick={async()=>{
              const val=document.getElementById("newWl").value.trim().toLowerCase();if(!val)return;
              await fetch("/api/whitelist",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({whitelist:[...whitelist,val]})});document.getElementById("newWl").value="";fetchWL();}}>Add</button>
          </div>
        </section>

        {/* 4. Blocked */}
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
