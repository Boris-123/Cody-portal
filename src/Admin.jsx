import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useAuth0 } from "@auth0/auth0-react";
import CompanyLogo from "./assets/logolatest.jpg";
import "./Admin.css";

/* ---------- helper components ---------- */
const PrettyBtn = ({
  variant = "primary",
  children,
  ...rest
}) => (
  <button className={`pbtn pbtn-${variant}`} {...rest}>
    {children}
  </button>
);

/** Generic table wrapper – adds fixed-width “Action” col. */
const SimpleTable = ({
  head,
  children,
  actionWidth = 96,
}) => (
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
/* --------------------------------------- */

/* normalise any back-end list into ["a@b", …] */
const extractEmails = (raw) => {
  const list = Array.isArray(raw)
    ? raw
    : raw?.blocked ?? raw?.whitelist ?? [];
  return list
    .map((e) => (typeof e === "string" ? e : e?.email))
    .filter(Boolean);
};

export default function Admin() {
  const { logout } = useAuth0();

  /* ───────── state ───────── */
  const [events, setEvents] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [maxUsers, setMaxUsers] = useState("");

  const [loadingEv, setLoadingEv] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expanded, setExpanded] = useState(null);

  /* ───────── fetch helpers ───────── */
  const fetchJson = async (url, opts = {}) => {
    try {
      const r = await fetch(url, opts);
      return r.ok ? r.json() : null;
    } catch {
      return null;
    }
  };

  const loadEvents = useCallback(
    async (signal) => {
      setLoadingEv(true);
      const data = await fetchJson("/api/admin-logins", {
        signal,
      });
      setEvents(Array.isArray(data) ? data : []);
      setLoadingEv(false);
    },
    []
  );

  const loadBlocked = useCallback(
    async (signal) => {
      const data = await fetchJson("/api/blocked-users", {
        signal,
      });
      setBlockedUsers(extractEmails(data));
    },
    []
  );

  const loadWhitelist = useCallback(
    async (signal) => {
      const data = await fetchJson("/api/whitelist", {
        signal,
      });
      setWhitelist(extractEmails(data));
    },
    []
  );

  const loadMax = useCallback(
    async (signal) => {
      const data = await fetchJson("/api/max-users", {
        signal,
      });
      setMaxUsers(data?.max?.toString() ?? "");
    },
    []
  );

  /* ───────── lifecycle ───────── */
  useEffect(() => {
    const ctrl = new AbortController();
    loadEvents(ctrl.signal);
    loadBlocked(ctrl.signal);
    loadWhitelist(ctrl.signal);
    loadMax(ctrl.signal);

    if (autoRefresh) {
      const id = setInterval(
        () => loadEvents(ctrl.signal),
        30_000
      );
      return () => {
        ctrl.abort();
        clearInterval(id);
      };
    }
    return () => ctrl.abort();
  }, [
    autoRefresh,
    loadEvents,
    loadBlocked,
    loadWhitelist,
    loadMax,
  ]);

  /* ───────── derived data ───────── */
  const grouped = useMemo(() => {
    const map = new Map();
    events.forEach((e) => {
      const key = e.email.toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return [...map.entries()].map(([email, all]) => ({
      email,
      username: email.split("@")[0],
      all,
      last: all.sort(
        (a, b) =>
          new Date(b.timestamp) - new Date(a.timestamp)
      )[0],
    }));
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return grouped.filter(({ username, last }) => {
      if (q && !username.toLowerCase().includes(q))
        return false;
      const ts = new Date(last.timestamp);
      if (dateFrom && ts < new Date(dateFrom)) return false;
      if (dateTo && ts > new Date(`${dateTo}T23:59:59`))
        return false;
      return true;
    });
  }, [grouped, search, dateFrom, dateTo]);

  const uniqueCnt = new Set(
    events.map((e) => e.email.toLowerCase())
  ).size;

  /* ───────── handlers ───────── */
  const toggleExpand = (email) =>
    setExpanded((p) => (p === email ? null : email));

  const exportCsv = () => {
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
    const blob = new Blob([rows.join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `login-events-${Date.now()}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ───────── UI ───────── */
  return (
    <div className="admin-container">
      {/* header */}
      <header className="admin-header">
        <div
          className="header-left"
          onClick={() => (window.location.href = "/")}
        >
          <img
            src={CompanyLogo}
            alt="logo"
            className="header-logo"
          />
          <h1 className="header-title">
            Polaris Admin Dashboard
          </h1>
        </div>
        <PrettyBtn
          variant="danger"
          onClick={() => logout()}
        >
          Log&nbsp;Out
        </PrettyBtn>
      </header>

      <main className="admin-main">
        {/* 1 – login events */}
        <section className="section-block">
          <h2 className="section-title">
            1. Current Login Events
          </h2>
          <p className="muted">
            Unique Users Logged&nbsp;In:{" "}
            <strong>{uniqueCnt}</strong>
          </p>

          {/* filters */}
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
              onChange={(e) =>
                setDateFrom(e.target.value)
              }
            />
            <input
              type="date"
              className="input input-date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <PrettyBtn
              onClick={() => loadEvents()}
              disabled={loadingEv}
            >
              {loadingEv ? "Loading…" : "Refresh"}
            </PrettyBtn>
            <PrettyBtn
              variant="secondary"
              onClick={exportCsv}
            >
              Export&nbsp;CSV
            </PrettyBtn>
            <label className="autoref-label">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) =>
                  setAutoRefresh(e.target.checked)
                }
              />
              auto&nbsp;30&nbsp;s
            </label>
          </div>

          {/* login table */}
          <SimpleTable
            head={[
              "Username",
              "Email",
              "Last Login",
              "Last IP",
              "Action",
            ]}
          >
            {filtered.map((u) => (
              <React.Fragment key={u.email}>
                <tr>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>
                    {new Date(
                      u.last.timestamp
                    ).toLocaleString()}
                  </td>
                  <td>{u.last.location ?? "–"}</td>
                  <td>
                    <PrettyBtn
                      variant="secondary"
                      onClick={() => toggleExpand(u.email)}
                    >
                      {expanded === u.email
                        ? "Hide"
                        : "Show"}
                    </PrettyBtn>
                  </td>
                </tr>
                {expanded === u.email &&
                  u.all.map((rec, i) => (
                    <tr
                      className="expand-row"
                      key={rec._id ?? i}
                    >
                      <td></td>
                      <td>{rec.email}</td>
                      <td>
                        {new Date(
                          rec.timestamp
                        ).toLocaleString()}
                      </td>
                      <td>{rec.location ?? "–"}</td>
                      <td></td>
                    </tr>
                  ))}
              </React.Fragment>
            ))}
          </SimpleTable>
        </section>

        {/* 2 – blocked users */}
        <section className="section-block">
          <h2 className="section-title">
            2. Blocked Users
          </h2>

          <SimpleTable head={["Email", "Action"]}>
            {blockedUsers.map((em) => (
              <tr key={em}>
                <td>{em}</td>
                <td>
                  <PrettyBtn
                    variant="danger"
                    onClick={async () => {
                      await fetch(
                        "/api/unblock-user",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type":
                              "application/json",
                          },
                          body: JSON.stringify({
                            email: em,
                          }),
                        }
                      );
                      setBlockedUsers((p) =>
                        p.filter((e) => e !== em)
                      );
                      loadBlocked();
                    }}
                  >
                    Unblock
                  </PrettyBtn>
                </td>
              </tr>
            ))}
          </SimpleTable>

          <div
            className="controls-row"
            style={{ marginTop: ".6rem" }}
          >
            <input
              id="newBL"
              className="input"
              type="email"
              placeholder="user@example.com"
            />
            <PrettyBtn
              onClick={async () => {
                const input =
                  document.getElementById("newBL");
                const v = input.value
                  .trim()
                  .toLowerCase();
                if (!v || blockedUsers.includes(v))
                  return;

                await fetch("/api/block-user", {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({ email: v }),
                });

                input.value = "";
                setBlockedUsers((p) => [...p, v]);
                loadBlocked();
              }}
            >
              Block
            </PrettyBtn>
          </div>
        </section>

        {/* 3 – max users */}
        <section className="section-block">
          <h2 className="section-title">
            3. Max-Users Limit
          </h2>

          <div className="controls-row">
            <input
              type="number"
              className="input"
              style={{ width: 120 }}
              value={maxUsers}
              onChange={(e) =>
                setMaxUsers(e.target.value)
              }
            />
            <PrettyBtn
              onClick={async () => {
                await fetch("/api/max-users", {
                  method: "PUT",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    max: Number(maxUsers),
                  }),
                });
                loadMax();
              }}
            >
              Save
            </PrettyBtn>
          </div>
        </section>

        {/* 4 – whitelist */}
        <section className="section-block">
          <h2 className="section-title">
            4. Whitelist
          </h2>

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
                        headers: {
                          "Content-Type":
                            "application/json",
                        },
                        body: JSON.stringify({
                          whitelist: whitelist.filter(
                            (e) => e !== em
                          ),
                        }),
                      });
                      setWhitelist((p) =>
                        p.filter((e) => e !== em)
                      );
                      loadWhitelist();
                    }}
                  >
                    Remove
                  </PrettyBtn>
                </td>
              </tr>
            ))}
          </SimpleTable>

          <div
            className="controls-row"
            style={{ marginTop: ".6rem" }}
          >
            <input
              id="newWL"
              className="input"
              type="email"
              placeholder="admin@example.com"
            />
            <PrettyBtn
              onClick={async () => {
                const input =
                  document.getElementById("newWL");
                const v = input.value
                  .trim()
                  .toLowerCase();
                if (!v || whitelist.includes(v))
                  return;

                await fetch("/api/whitelist", {
                  method: "PUT",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    whitelist: [...whitelist, v],
                  }),
                });

                input.value = "";
                setWhitelist((p) => [...p, v]);
                loadWhitelist();
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
