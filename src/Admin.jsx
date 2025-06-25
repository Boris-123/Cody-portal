// Admin.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import CompanyLogo from "./assets/logolatest.jpg";
import "./Admin.css";

export default function Admin() {
  const { logout } = useAuth0();

  const [events, setEvents] = useState([]);
  const [expandedUser, setExpandedUser] = useState(null);
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

  // Group events by email
  const groupedEvents = useMemo(() => {
    const map = new Map();
    events.forEach((e) => {
      if (!map.has(e.email)) map.set(e.email, []);
      map.get(e.email).push(e);
    });
    map.forEach((evts) => evts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    return Array.from(map.entries());
  }, [events]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return groupedEvents
      .filter(([email, evts]) => {
        const username = email.split("@")[0].toLowerCase();
        const latest = evts[0];
        if (s && !username.includes(s)) return false;
        if (dateFrom && new Date(latest.timestamp) < new Date(dateFrom)) return false;
        if (dateTo && new Date(latest.timestamp) > new Date(dateTo + "T23:59:59")) return false;
        return true;
      })
      .sort(([emailA, a], [emailB, b]) => {
        const dir = sort.asc ? 1 : -1;
        if (sort.col === "username") return dir * emailA.localeCompare(emailB);
        if (sort.col === "ip") return dir * ((a[0].location || "").localeCompare(b[0].location || ""));
        return dir * (new Date(a[0].timestamp) - new Date(b[0].timestamp));
      });
  }, [groupedEvents, search, dateFrom, dateTo, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const current = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const exportCsv = () => {
    const rows = ["Username,Email,When,IP"];
    filtered.forEach(([email, evts]) => {
      evts.forEach((e) => {
        rows.push(`${email.split("@")[0]},${email},${new Date(e.timestamp).toISOString()},${e.location || ""}`);
      });
    });
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `login-events-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (col) => setSort((s) => ({ col, asc: s.col === col ? !s.asc : true }));

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="header-left" onClick={() => (window.location.href = "/")}>
          <img src={CompanyLogo} alt="Logo" className="header-logo" />
          <h1 className="header-title">Polaris Admin Dashboard</h1>
        </div>
        <button className="btn btn-danger" onClick={() => logout({ returnTo: window.location.origin })}>
          Log Out
        </button>
      </header>

      <main className="admin-main">
        <section className="section-block">
          <h2 className="section-title">1. Current Login Events</h2>
          <div className="controls-row">
            <input className="input" placeholder="Search Username" value={search} onChange={(e) => setSearch(e.target.value)} />
            <input type="date" className="input input-date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <input type="date" className="input input-date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <button className="btn btn-primary" onClick={fetchEvents} disabled={loadingEv}>
              {loadingEv ? "Loading…" : "Refresh"}
            </button>
            <button className="btn btn-secondary" onClick={exportCsv}>Export CSV</button>
            <label className="autoref-label">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto refresh 30 s
            </label>
          </div>

          <div className="table-container">
            <table className="events-table" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th onClick={() => toggleSort("username")}>Username</th>
                  <th>Email</th>
                  <th onClick={() => toggleSort("timestamp")}>Last Login</th>
                  <th onClick={() => toggleSort("ip")}>Last IP</th>
                  <th>Expand</th>
                </tr>
              </thead>
              <tbody>
                {current.map(([email, evts]) => (
                  <React.Fragment key={email}>
                    <tr>
                      <td>{email.split("@")[0]}</td>
                      <td>{email}</td>
                      <td>{new Date(evts[0].timestamp).toLocaleString()}</td>
                      <td>{evts[0].location || "–"}</td>
                      <td>
                        <button onClick={() => setExpandedUser(expandedUser === email ? null : email)}>
                          {expandedUser === email ? "Hide" : "Show"}
                        </button>
                      </td>
                    </tr>
                    {expandedUser === email &&
                      evts.slice(1).map((e) => (
                        <tr key={e._id} className="sub-row">
                          <td colSpan={2}></td>
                          <td>{new Date(e.timestamp).toLocaleString()}</td>
                          <td>{e.location || "–"}</td>
                          <td></td>
                        </tr>
                      ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
