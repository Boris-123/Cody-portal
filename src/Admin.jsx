import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useAuth0 } from "@auth0/auth0-react";
import CompanyLogo from "./assets/logolatest.jpg";
import "./Admin.css";

/* ═════════ helper components ═════════ */

const PrettyBtn = ({ variant = "primary", children, ...rest }) => (
  <button className={`pbtn pbtn-${variant}`} {...rest}>
    {children}
  </button>
);

const SimpleTable = ({ head, children, actionWidth = 96 }) => (
  <div className="table-wrapper">
    <table className="events-table">
      <colgroup>
        {head.map((_, i) =>
          i === head.length - 1 ? (
            <col key={i} style={{ width: actionWidth }} />
          ) : (
            <col key={i} />
          )
        )}
      </colgroup>
      <thead>
        <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

/* ═════════ helper: normalise any payload → ["email"] ═════════ */

const extractEmails = (raw) => {
  const pools = [];

  if (Array.isArray(raw)) pools.push(raw);
  else if (raw && typeof raw === "object") {
    ["blocked", "whitelist", "items", "data"].forEach((k) => {
      if (Array.isArray(raw[k])) pools.push(raw[k]);
    });
  }

  return pools
    .flat()
    .map((x) =>
      typeof x === "string"
        ? x
        : x?.email || x?.mail || x?.address || x?.user || x?.username
    )
    .filter(Boolean);
};

/* ═════════ main ═════════ */

export default function Admin() {
  const { logout } = useAuth0();

  /* ── state ── */
  const [events, setEvents] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [maxUsers, setMaxUsers] = useState("");

  const [loadingEv, setLoadingEv] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [auto, setAuto] = useState(true);
  const [expanded, setExpanded] = useState(null);

  /* ── helpers ── */
  const getJSON = (url, opts = {}) =>
    fetch(url, opts).then((r) => (r.ok ? r.json() : null)).catch(() => null);

  const mergeSet =
    (setter) =>
    (list) =>
      setter((prev) => {
        const merged = [...new Set([...prev, ...list])];
        return list.length === 0 ? prev : merged;
      });

  /* ── loaders ── */
  const loadEvents = useCallback(
    async (signal) => {
      setLoadingEv(true);
      const data = await getJSON("/api/admin-logins", signal ? { signal } : {});
      setEvents(Array.isArray(data) ? data : []);
      setLoadingEv(false);
    },
    []
  );

  const loadBlocked = useCallback(
    async (signal) => {
      const data = await getJSON("/api/blocked-users", signal ? { signal } : {});
      mergeSet(setBlocked)(extractEmails(data));
    },
    []
  );

  const loadWhitelist = useCallback(
    async (signal) => {
      const data = await getJSON("/api/whitelist", signal ? { signal } : {});
      setWhitelist(extractEmails(data));
    },
    []
  );

  const loadMax = useCallback(async (signal) => {
    const data = await getJSON("/api/max-users", signal ? { signal } : {});
    setMaxUsers(data?.max?.toString() ?? "");
  }, []);

  /* ── bootstrap + auto refresh ── */
  useEffect(() => {
    const c = new AbortController();
    loadEvents(c.signal);
    loadBlocked(c.signal);
    loadWhitelist(c.signal);
    loadMax(c.signal);

    if (auto) {
      const id = setInterval(() => loadEvents(c.signal), 30_000);
      return () => {
        c.abort();
        clearInterval(id);
      };
    }
    return () => c.abort();
  }, [auto, loadEvents, loadBlocked, loadWhitelist, loadMax]);

  /* ── computed ── */
  const grouped = useMemo(() => {
    const m = new Map();
    events.forEach((e) => {
      const key = e.email.toLowerCase();
      m.set(key, [...(m.get(key) || []), e]);
    });
    return [...m.entries()].map(([email, all]) => ({
      email,
      username: email.split("@")[0],
      all,
      last: all.reduce((p, c) =>
        new Date(c.timestamp) > new Date(p.timestamp) ? c : p
      ),
    }));
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return grouped.filter(({ username, last }) => {
      if (q && !username.toLowerCase().includes(q)) return false;
      const ts = new Date(last.timestamp);
      if (dateFrom && ts < new Date(dateFrom)) return false;
      if (dateTo && ts > new Date(`${dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [grouped, search, dateFrom, dateTo]);

  const uniqueCnt = new Set(events.map((e) => e.email.toLowerCase())).size;

  /* ═════════ render ═════════ */
  return (
    <div className="admin-container">
      {/* header */}
      <header className="admin-header">
        <div className="header-left" onClick={() => (window.location.href = "/")}>
          <img src={CompanyLogo} alt="" className="header-logo" />
          <h1 className="header-title">Polaris Admin Dashboard</h1>
        </div>
        <PrettyBtn variant="danger" onClick={() => logout()}>
          Log&nbsp;Out
        </PrettyBtn>
      </header>

      <main className="admin-main">
        {/* 1 ─ Current logins */}
        <section className="section-block">
          <h2 className="section-title">1. Current Login Events</h2>
          <p className="muted">
            Unique Users Logged&nbsp;In: <strong>{uniqueCnt}</strong>
          </p>

          <div className="controls-row">
            <input
              className="input"
              placeholder="Search username"
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
            <PrettyBtn onClick={() => loadEvents()} disabled={loadingEv}>
              {loadingEv ? "Loading…" : "Refresh"}
            </PrettyBtn>
            <PrettyBtn variant="secondary" onClick={() => {
              const rows = [
                ["Username", "Email", "Timestamp", "IP"].join(","),
                ...events.map((e) =>
                  [
                    e.email.split("@")[0],
                    e.email,
                    new Date(e.timestamp).toISOString(),
                    e.location ?? "",
                  ].join(",")
                ),
              ];
              const blob = new Blob([rows.join("\n")], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = Object.assign(document.createElement("a"), {
                href: url,
                download: `login-events-${Date.now()}.csv`,
              });
              a.click();
              URL.revokeObjectURL(url);
            }}>
              Export&nbsp;CSV
            </PrettyBtn>
            <label className="autoref-label">
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
              />
              auto&nbsp;30&nbsp;s
            </label>
          </div>

          <SimpleTable head={["Username", "Email", "Last Login", "Last IP", "Action"]}>
            {filtered.map((u) => (
              <React.Fragment key={u.email}>
                <tr>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>{new Date(u.last.timestamp).toLocaleString()}</td>
                  <td>{u.last.location ?? "–"}</td>
                  <td>
                    <PrettyBtn
                      variant="secondary"
                      onClick={() =>
                        setExpanded((p) => (p === u.email ? null : u.email))
                      }
                    >
                      {expanded === u.email ? "Hide" : "Show"}
                    </PrettyBtn>
                  </td>
                </tr>
                {expanded === u.email &&
                  u.all.map((rec, i) => (
                    <tr className="expand-row" key={rec._id ?? i}>
                      <td></td>
                      <td>{rec.email}</td>
                      <td>{new Date(rec.timestamp).toLocaleString()}</td>
                      <td>{rec.location ?? "–"}</td>
                      <td></td>
                    </tr>
                  ))}
              </React.Fragment>
            ))}
          </SimpleTable>
        </section>

        {/* 2 ─ Blocked users */}
        <section className="section-block">
          <h2 className="section-title">2. Blocked Users</h2>

          <SimpleTable head={["Email", "Action"]}>
            {blocked.map((em) => (
              <tr key={em}>
                <td>{em}</td>
                <td>
                  <PrettyBtn
                    variant="danger"
                    onClick={async () => {
                      await fetch("/api/unblock-user", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: em }),
                      });
                      // remove locally
                      setBlocked((prev) => prev.filter((e) => e !== em));
                      // wait a tick so the DB delete finishes, then re-sync
                      await new Promise((r) => setTimeout(r, 300));
                      await loadBlocked();
                    }}
                  >
                    Unblock
                  </PrettyBtn>
                </td>
              </tr>
            ))}
          </SimpleTable>

          <div className="controls-row" style={{ marginTop: ".6rem" }}>
            <input id="newBL" className="input" type="email" placeholder="user@example.com" />
            <PrettyBtn
              onClick={async () => {
                const inp = document.getElementById("newBL");
                const v = inp.value.trim().toLowerCase();
                if (!v || blocked.includes(v)) return;

                await fetch("/api/block-user", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: v }),
                });

                /* wait a tick so the DB upsert is definitely visible */
                await new Promise((r) => setTimeout(r, 300));
                inp.value = "";
                await loadBlocked();
              }}
            >
              Block
            </PrettyBtn>
          </div>
        </section>

        {/* 3 ─ Max users */}
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
            <PrettyBtn
              onClick={async () => {
                await fetch("/api/max-users", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ max: Number(maxUsers) }),
                });
                loadMax();
              }}
            >
              Save
            </PrettyBtn>
          </div>
        </section>

        {/* 4 ─ Whitelist */}
        <section className="section-block">
          <h2 className="section-title">4. Whitelist</h2>

          <SimpleTable head={["Email", "Action"]}>
            {whitelist.map((em) => (
              <tr key={em}>
                <td>{em}</td>
                <td>
                  <PrettyBtn
                    variant="danger"
                    onClick={async () => {
                      await fetch("/api/whitelist", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          whitelist: whitelist.filter((e) => e !== em),
                        }),
                      });
                      // 1️⃣ remove locally
                      setWhitelist((prev) => prev.filter((e) => e !== em));
                      // 2️⃣ wait a tick for the DB write, then refresh from server
                      await new Promise((r) => setTimeout(r, 300));
                      await loadWhitelist();
                    }}
                  >
                    Remove
                  </PrettyBtn>
                </td>
              </tr>
            ))}
          </SimpleTable>

          <div className="controls-row" style={{ marginTop: ".6rem" }}>
            <input id="newWL" className="input" type="email" placeholder="admin@example.com" />
            <PrettyBtn
              onClick={async () => {
                const inp = document.getElementById("newWL");
                const v = inp.value.trim().toLowerCase();
                if (!v || whitelist.includes(v)) return;

                await fetch("/api/whitelist", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ whitelist: [...whitelist, v] }),
                });

                await new Promise((r) => setTimeout(r, 300));
                inp.value = "";
                await loadWhitelist();
              }}
            >
              Add
            </PrettyBtn>
          </div>
        </section>
      </main>
    </div>
  );
}
