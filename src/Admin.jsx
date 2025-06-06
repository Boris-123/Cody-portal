// src/Admin.jsx

import React, { useState, useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "./Admin.css";
import CompanyLogo from "./assets/logolatest.jpg";

/**
 * Polaris Admin Dashboard
 *
 * 功能汇总：
 * 1. 只有 Auth0 登录用户可访问，此功能由 App.jsx 的 <Route> 保护
 * 2. 顶部显示 Logo（点击返回聊天界面 /）和 “Log Out” 按钮
 * 3. 1. Current Login Events
 *    - 搜索 Username（email 前缀），实时过滤
 *    - 点击 “Refresh Now” 刷新列表
 *    - 表格显示 Username、Email、When、Location(IP)、Action(“Remove User”)
 *    - 点击 “Remove User” 会删除该 userId 的所有登录事件，从而释放名额
 * 4. 2. Max-Users Limit
 *    - 显示当前 unique 用户数，用于参考
 *    - 可输入新的数字并点击 “Save Limit” 更新
 * 5. 3. Whitelist Management
 *    - 左上角提示当前白名单中有哪些邮箱
 *    - 可手动输入一个邮箱并点击 “Add to Whitelist” 将它加入列表
 *    - 表格列出所有白名单邮箱，每行右侧有 “Remove” 按钮，点击删除该邮箱
 */

export default function Admin() {
  const { logout } = useAuth0();

  // --- 登录事件相关状态 ---
  const [events, setEvents] = useState([]); // 所有登录事件
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [errorEvents, setErrorEvents] = useState("");

  // 搜索框输入的 username 关键字（email 前缀）
  const [searchKeyword, setSearchKeyword] = useState("");

  // 过滤后要显示的事件数组
  const filteredEvents = events.filter((ev) => {
    const username = ev.email.split("@")[0] || "";
    return username.toLowerCase().includes(searchKeyword.toLowerCase());
  });

  // uniqueCount：去重后有多少个不同 username
  const [uniqueCount, setUniqueCount] = useState(0);

  // --- Max-Users 相关状态 ---
  const [maxUsers, setMaxUsers] = useState("");
  const [loadingMax, setLoadingMax] = useState(false);
  const [savingMax, setSavingMax] = useState(false);
  const [errorMax, setErrorMax] = useState("");

  // --- Whitelist 管理相关状态 ---
  const [whitelist, setWhitelist] = useState([]); // 当前白名单数组
  const [loadingWL, setLoadingWL] = useState(false);
  const [savingWL, setSavingWL] = useState(false);
  const [errorWL, setErrorWL] = useState("");
  const [newWLItem, setNewWLItem] = useState(""); // 输入框中的新邮箱

  // -------- 拉取登录事件列表 --------
  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    setErrorEvents("");
    try {
      const resp = await fetch("/api/admin-logins");
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      const data = await resp.json(); // 期望返回 Array< { _id, userId, email, timestamp, location } >
      setEvents(data);
      // 计算 unique username 数量
      const uniqueSet = new Set(data.map((ev) => ev.email.split("@")[0] || ""));
      setUniqueCount(uniqueSet.size);
    } catch (err) {
      console.error("Failed to fetch login events:", err);
      setErrorEvents("Failed to fetch login events. Please try again.");
      setEvents([]);
      setUniqueCount(0);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  // -------- 删除指定 userId 的所有登录事件 --------
  const removeUser = async (userId) => {
    if (!window.confirm("Are you sure to remove all login records for user “" + userId + "”?")) {
      return;
    }
    try {
      const resp = await fetch("/api/admin-logins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.error || `Status ${resp.status}`);
      }
      // 删除成功后，刷新页面
      fetchEvents();
    } catch (err) {
      console.error("Failed to remove user:", err);
      setErrorEvents("Failed to remove user. Please try again.");
    }
  };

  // -------- 拉取当前 maxUsers 值 --------
  const fetchMaxUsers = useCallback(async () => {
    setLoadingMax(true);
    setErrorMax("");
    try {
      const resp = await fetch("/api/max-users");
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      const body = await resp.json(); // 期望 { max: number }
      setMaxUsers(body.max.toString());
    } catch (err) {
      console.error("Failed to fetch maxUsers:", err);
      setErrorMax("Failed to fetch max-users. Please reload and try again.");
      setMaxUsers("");
    } finally {
      setLoadingMax(false);
    }
  }, []);

  // -------- 保存新的 maxUsers --------
  const saveMaxUsers = async () => {
    const newMax = parseInt(maxUsers, 10);
    if (isNaN(newMax) || newMax < 0) {
      setErrorMax("Please enter a non-negative integer.");
      return;
    }
    setSavingMax(true);
    setErrorMax("");
    try {
      const resp = await fetch("/api/max-users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max: newMax }),
      });
      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.error || `Status ${resp.status}`);
      }
      await fetchMaxUsers();
    } catch (err) {
      console.error("Failed to save maxUsers:", err);
      setErrorMax("Failed to save. Please try again.");
    } finally {
      setSavingMax(false);
    }
  };

  // -------- 拉取当前 whitelist --------
  const fetchWhitelist = useCallback(async () => {
    setLoadingWL(true);
    setErrorWL("");
    try {
      const resp = await fetch("/api/whitelist");
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      const body = await resp.json(); // { whitelist: [emails] }
      setWhitelist(body.whitelist || []);
    } catch (err) {
      console.error("Failed to fetch whitelist:", err);
      setErrorWL("Failed to fetch whitelist. Please try again.");
      setWhitelist([]);
    } finally {
      setLoadingWL(false);
    }
  }, []);

  // -------- 将当前 whitelist 覆盖写入（PUT） --------
  const saveWhitelist = async (newArray) => {
    setSavingWL(true);
    setErrorWL("");
    try {
      const resp = await fetch("/api/whitelist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whitelist: newArray }),
      });
      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.error || `Status ${resp.status}`);
      }
      await fetchWhitelist();
    } catch (err) {
      console.error("Failed to save whitelist:", err);
      setErrorWL("Failed to update whitelist. Please try again.");
    } finally {
      setSavingWL(false);
    }
  };

  // -------- 页面初次加载时同时拉取三块数据 --------
  useEffect(() => {
    fetchEvents();
    fetchMaxUsers();
    fetchWhitelist();
  }, [fetchEvents, fetchMaxUsers, fetchWhitelist]);

  // -------- 界面渲染 --------
  return (
    <div className="admin-container">
      {/* ========= 顶部 Header ========= */}
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
        {/* ========= 错误提示：登录事件 & 保存 Max & Whitelist 的错误 ========= */}
        {errorEvents && <div className="alert-error">{errorEvents}</div>}
        {errorMax && <div className="alert-error">{errorMax}</div>}
        {errorWL && <div className="alert-error">{errorWL}</div>}

        {/* ========= 1. Current Login Events 区块 ========= */}
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
              {loadingEvents ? "Refreshing..." : "Refresh Now"}
            </button>
          </div>

          <div className="table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>When</th>
                  <th>Location (IP)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="no-data-cell">
                      No login events yet.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((ev) => {
                    const username = ev.email.split("@")[0] || ev.userId;
                    const whenStr = new Date(ev.timestamp).toLocaleString([], {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });
                    return (
                      <tr key={ev._id}>
                        <td>{username}</td>
                        <td>{ev.email}</td>
                        <td>{whenStr}</td>
                        <td>{ev.location || "–"}</td>
                        <td>
                          <button
                            className="btn-remove-user"
                            onClick={() => removeUser(ev.userId)}
                          >
                            Remove User
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ========= 2. Max-Users Limit 区块 ========= */}
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
              placeholder="Enter max users"
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value)}
              className="max-users-input"
              disabled={loadingMax || savingMax}
            />
            <button
              className="btn-save"
              onClick={saveMaxUsers}
              disabled={loadingMax || savingMax}
            >
              {savingMax
                ? "Saving..."
                : loadingMax
                ? "Loading..."
                : "Save Limit"}
            </button>
          </div>
        </section>

        {/* ========= 3. Whitelist Management 区块 ========= */}
        <section className="section-block">
          <h2 className="section-title">3. Whitelist Management</h2>
          <p>
            Only these emails can access the admin dashboard. Add / remove below:
          </p>

          {/* 添加新邮箱到白名单 */}
          <div className="controls-row">
            <input
              type="email"
              placeholder="Enter admin email"
              value={newWLItem}
              onChange={(e) => setNewWLItem(e.target.value)}
              className="whitelist-input"
              disabled={loadingWL || savingWL}
            />
            <button
              className="btn-add"
              onClick={async () => {
                const email = newWLItem.trim().toLowerCase();
                if (!email) {
                  setErrorWL("Please enter a valid email.");
                  return;
                }
                if (whitelist.includes(email)) {
                  setErrorWL("This email is already in whitelist.");
                  return;
                }
                await saveWhitelist([...whitelist, email]);
                setNewWLItem("");
              }}
              disabled={loadingWL || savingWL}
            >
              {savingWL ? "Saving..." : "Add to Whitelist"}
            </button>
          </div>

          {/* 白名单列表 */}
          <div className="table-container">
            <table className="whitelist-table">
              <thead>
                <tr>
                  <th>Admin Email</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {whitelist.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="no-data-cell">
                      No emails in whitelist.
                    </td>
                  </tr>
                ) : (
                  whitelist.map((email) => (
                    <tr key={email}>
                      <td>{email}</td>
                      <td>
                        <button
                          className="btn-remove-wl"
                          onClick={async () => {
                            const newList = whitelist.filter((e) => e !== email);
                            await saveWhitelist(newList);
                          }}
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
      </main>
    </div>
  );
}
