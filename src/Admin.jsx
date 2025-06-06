// src/Admin.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "./Admin.css"; // 引入对应样式
import CompanyLogo from "./assets/company-logo.png";

/**
 * Polaris Admin Dashboard
 *
 * 功能：
 * 1. 登录后才能访问（由 App.jsx 中路由保护）
 * 2. 点击左上角 Logo 返回首页（“Return to Bot”）
 * 3. 右上角显示 “Log Out” 按钮
 * 4. “Search Username” 输入框：可以根据用户名（email 前缀）搜索
 * 5. “Refresh Now” 按钮：刷新当前登录事件列表
 * 6. 显示 “Current Login Events” 表格：列包含 Username、Email、When、Location(IP)
 * 7. “Max-Users Limit” 区块：展示当前 unique count，并可修改最大用户数
 */

export default function Admin() {
  const { logout } = useAuth0();
  const { user, isAuthenticated } = useAuth0();
  const allowedAdmins = ["edy.hartono.pias@gmail.com","borisyinjia2005@outlook.com"]; // 例
  if (!isAuthenticated || !allowedAdmins.includes(user.email)) {
  return <div>Access Denied</div>;
}


  // 登录事件列表、loading 与错误状态
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [errorEvents, setErrorEvents] = useState("");

  // 用户名搜索关键字（email 前缀）
  const [searchKeyword, setSearchKeyword] = useState("");

  // 过滤后要显示在页面上的事件
  const filteredEvents = events.filter((ev) => {
    // 从 email 中提取前缀
    const username = ev.email.split("@")[0] || "";
    return username.toLowerCase().includes(searchKeyword.toLowerCase());
  });

  // uniqueCount、maxUsers 及其 loading/saving/错误状态
  const [uniqueCount, setUniqueCount] = useState(0);
  const [maxUsers, setMaxUsers] = useState("");
  const [loadingMax, setLoadingMax] = useState(false);
  const [savingMax, setSavingMax] = useState(false);
  const [errorMax, setErrorMax] = useState("");

  // -------- 拉取登录事件列表 --------
  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    setErrorEvents("");
    try {
      const resp = await fetch("/api/admin-logins");
      if (!resp.ok) {
        throw new Error(`Status ${resp.status}`);
      }
      const data = await resp.json();
      setEvents(data);

      // 计算 unique username 数量
      const uniqueSet = new Set(
        data.map((ev) => ev.email.split("@")[0] || "")
      );
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

  // -------- 拉取当前 maxUsers 值 --------
  const fetchMaxUsers = useCallback(async () => {
    setLoadingMax(true);
    setErrorMax("");
    try {
      const resp = await fetch("/api/max-users");
      if (!resp.ok) {
        throw new Error(`Status ${resp.status}`);
      }
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
      // 保存成功后，重新拉取唯一用户数（不影响此处 uniqueCount）
      await fetchMaxUsers();
    } catch (err) {
      console.error("Failed to save maxUsers:", err);
      setErrorMax("Failed to save. Please try again.");
    } finally {
      setSavingMax(false);
    }
  };

  // 组件挂载后，先拉取一次
  useEffect(() => {
    fetchEvents();
    fetchMaxUsers();
  }, [fetchEvents, fetchMaxUsers]);

  return (
    <div className="admin-container">
      {/* 顶部标题栏 */}
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
        <button className="btn-log-out" onClick={() => logout({ returnTo: window.location.origin })}>
          Log Out
        </button>
      </header>

      {/* 整个主体滚动区域 */}
      <main className="admin-main">
        {errorEvents && (
          <div className="alert-error">{errorEvents}</div>
        )}

        {/* 1. Current Login Events */}
        <section className="section-block">
          <h2 className="section-title">1. Current Login Events</h2>
          <p>
            Unique Users Logged In: <strong>{uniqueCount}</strong>
          </p>

          {/* 搜索框 + 刷新按钮 */}
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

          {/* 登录事件表格 */}
          <div className="table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>When</th>
                  <th>Location (IP)</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", color: "#777" }}>
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Max-Users Limit */}
        <section className="section-block">
          <h2 className="section-title">2. Max-Users Limit</h2>
          <p>
            Set how many unique users can log in before new logins are blocked.{" "}
            <span className="sm-text">(Current Unique Count: {uniqueCount})</span>
          </p>
          {errorMax && (
            <div className="alert-error">{errorMax}</div>
          )}

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
      </main>
    </div>
  );
}
