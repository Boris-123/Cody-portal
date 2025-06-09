import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useAuth0 } from "@auth0/auth0-react";
import CompanyLogo from "./assets/logolatest.jpg";
import "./Admin.css";

/*───────────────────────────────────────────────
  Polaris Admin Dashboard · 2025-06-11
───────────────────────────────────────────────*/

export default function Admin() {
  /* ---------- Auth ---------- */
  const { logout } = useAuth0();

  /* ---------- Login events ---------- */
  const [events, setEvents]        = useState([]);
  const [loadingEv, setLoadingEv]  = useState(false);
  const [search, setSearch]        = useState("");
  const [from, setFrom]            = useState("");
  const [to, setTo]                = useState("");
  const [rowsPerPage, setRows]     = useState(10);
  const [page, setPage]            = useState(1);
  const [sort, setSort]            = useState({ col: "timestamp", asc: false });
  const [auto, setAuto]            = useState(true);

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

  /* initial + auto refresh */
  useEffect(() => {
    fetchEvents();
    if (!auto) return;
    const id = setInterval(fetchEvents, 30_000);
    return () => clearInterval(id);
  }, [auto, fetchEvents]);

  /* filter & sort */
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return events
      .filter((e) => {
        if (s && !e.email.split("@")[0].toLowerCase().includes(s)) return false;
        const d = new Date(e.timestamp);
        if (from && d < new Date(from)) return false;
        if (to && d > new Date(to + "T23:59:59")) return false;
        return true;
      })
      .sort((a, b) => {
        const dir = sort.asc ? 1 : -1;
        if (sort.col === "username")
          return dir * a.email.localeCompare(b.email);
        if (sort.col === "ip")
          return dir * (a.location || "").localeCompare(b.location || "");
        return dir * (new Date(a.timestamp) - new Date(b.timestamp));
      });
  }, [events, search, from, to, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const current   = filtered.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );
  const uniqueCnt = new Set(events.map((e) => e.email.split("@")[0])).size;
  const toggleSort = (col) =>
    setSort((s) => ({ col, asc: s.col === col ? !s.asc : true }));

  /* CSV export */
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

  /* ---------- Max-Users ---------- */
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

  /* ---------- Whitelist ---------- */
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

  /* ---------- Blocked ---------- */
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

  /* ---------- Render ---------- */
  return (
    <div className="admin-container">
      {/* Header */}
      <header className="admin-header">
        <div
          className="header-left"
          onClick={() => (window.location.href = "/")}
        >
          <img src={CompanyLogo} alt="logo" className="header-logo" />
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
          <p className="sm-text">
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
              className="input-date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <input
              type="date"
              className="input-date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <div className="btn-group">
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
            <table className="events-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort("username")}>Username</th>
                  <th>Email</th>
                  <th onClick={() => toggleSort("timestamp")}>When</th>
                  <th onClick={() => toggleSort("ip")}>IP</th>
                  <th className="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {current.map((e) => (
                  <tr key={e._id}>
                    <td>{e.email.split("@")[0]}</td>
                    <td>{e.email}</td>
                    <td>{new Date(e.timestamp).toLocaleString()}</td>
                    <td>{e.location || "–"}</td>
                    <td className="col-action">
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
            <table className="whitelist-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th className="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {whitelist.map((em) => (
                  <tr key={em}>
                    <td>{em}</td>
                    <td className="col-action">
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
                const email = document
                  .getElementById("newWL")
                  .value.trim()
                  .toLowerCase();
                if (!email || whitelist.includes(email)) return;
                await fetch("/api/whitelist", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ whitelist: [...whitelist, email] }),
                });
                document.getElementById("newWL").value = "";
                fetchWL();
              }}
            >
              Add
            </button>
          </div>
        </section>

        {/* 4 ─ Blocked users */}
        <section className="section-block">
          <h2 className="section-title">4. Blocked Users</h2>
          <div className="table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th className="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {blocked.map((em) => (
                  <tr key={em}>
                    <td>{em}</td>
                    <td className="col-action">
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
                    <td colSpan="2" style={{ textAlign: "center" }}>
                      (None)
                    </td>
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
                const email = document
                  .getElementById("newBL")
                  .value.trim()
                  .toLowerCase();
                if (!email) return;
                await fetch("/api/block-user", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
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
