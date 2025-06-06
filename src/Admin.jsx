// src/Admin.jsx

import React, { useEffect, useState, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react"; 
import CompanyLogo from "./assets/company-logo.png"; // 公司 Logo
import "./Admin.css"; // 引入样式

/**
 * Admin 组件：只有白名单邮箱才能访问
 *
 * 功能：
 * 1. 判断用户是否正在加载（isLoading）。
 * 2. 如果未登录，则自动跳转 Auth0 登录。
 * 3. 登录后，检查 user.email 是否在 allowedEmails 列表里。
 *    - 如果不在白名单，显示 “Access Denied”。
 *    - 如果在白名单，则展示后台仪表盘：
 *      3.1. “Unique Users Logged In” 列表（带 Refresh 按钮）。
 *      3.2. 当前 unique 用户数统计。
 *      3.3. “Max Users Limit” 输入框 & 保存按钮（Save Limit）。
 *      3.4. 页面顶部有 “Logout” 按钮，点击可登出并返回 Auth0 重定向地址。
 * 4. 各个网络请求都有 loading 和 error 状态处理。
 */

export default function Admin() {
  // 1. Auth0 Hook：获取用户信息、登录状态、登出方法等
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    logout,
  } = useAuth0();

  // 2. 白名单邮箱列表（只有此列表中的邮箱可访问 Admin 页面）
  const allowedEmails = ["edy.hartono.pias@gmail.com", "borisyinjia2005@outlook.com"]; // 请将此行替换为老板的实际邮箱

  // 3. 页面状态声明
  // 登录事件列表：{ userId, email, timestamp, location }
  const [events, setEvents] = useState([]);
  // 去重后有多少 unique user
  const [uniqueCount, setUniqueCount] = useState(0);
  // maxUsers（后台存储的限制值，用字符串保存，方便绑定到 <input>）
  const [maxUsers, setMaxUsers] = useState("");
  // 各种 loading / saving 状态
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingMax, setLoadingMax] = useState(false);
  const [savingMax, setSavingMax] = useState(false);
  // 错误信息
  const [errorMsg, setErrorMsg] = useState("");

  // 4. 如果 Auth0 仍在加载，先展示 Loading
  if (isLoading) {
    return (
      <div className="admin-container">
        <header className="admin-header">
          <img src={CompanyLogo} alt="Company Logo" className="admin-logo" />
          <h1>Polaris Admin Dashboard</h1>
        </header>
        <main className="admin-main">
          <div className="loading">Loading...</div>
        </main>
      </div>
    );
  }

  // 5. 如果未登录，自动调用 Auth0 登录
  if (!isAuthenticated) {
    loginWithRedirect();
    return null; // 等待登录完成
  }

  // 6. 如果登录但邮箱不在白名单里，展示 Access Denied
  if (!allowedEmails.includes(user.email)) {
    return (
      <div className="admin-container">
        <header className="admin-header">
          <img src={CompanyLogo} alt="Company Logo" className="admin-logo" />
          <h1>Polaris Admin Dashboard</h1>
          <button
            className="logout-btn"
            onClick={() => logout({ returnTo: window.location.origin })}
          >
            Log Out
          </button>
        </header>
        <main className="admin-main">
          <div className="access-denied">
            Access Denied. You are not authorized to view this page.
          </div>
        </main>
      </div>
    );
  }

  // 7. 拉取 “login events” 列表的函数
  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    setErrorMsg("");
    try {
      const resp = await fetch("/api/admin-logins"); // 后端 API：获取所有登录事件
      if (!resp.ok) {
        throw new Error(`Status ${resp.status}`);
      }
      const data = await resp.json();
      setEvents(data);

      // 计算 unique users 数量
      const uniqueSet = new Set(data.map((evt) => evt.userId));
      setUniqueCount(uniqueSet.size);
    } catch (err) {
      console.error("Failed to fetch login events:", err);
      setErrorMsg("Failed to fetch login events. Please try again.");
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  // 8. 拉取当前 maxUsers 限制值的函数
  const fetchMaxUsers = useCallback(async () => {
    setLoadingMax(true);
    setErrorMsg("");
    try {
      const resp = await fetch("/api/max-users"); // 后端 API：获取当前最大用户数
      if (!resp.ok) {
        throw new Error(`Status ${resp.status}`);
      }
      const body = await resp.json(); // 期望 { max: number }
      setMaxUsers(body.max.toString());
    } catch (err) {
      console.error("Failed to fetch maxUsers:", err);
      setErrorMsg("Failed to fetch max users. Please try again.");
    } finally {
      setLoadingMax(false);
    }
  }, []);

  // 9. 保存新的 maxUsers 限制值的函数
  const saveMaxUsers = async () => {
    setSavingMax(true);
    setErrorMsg("");
    try {
      const newVal = parseInt(maxUsers, 10);
      if (isNaN(newVal) || newVal < 0) {
        setErrorMsg("Please enter a valid non-negative number for Max Users.");
        setSavingMax(false);
        return;
      }
      const resp = await fetch("/api/max-users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max: newVal }),
      });
      if (!resp.ok) {
        throw new Error(`Status ${resp.status}`);
      }
      // 如果成功，无需额外操作，只留下当前值
      // 也可在此处弹窗提示 “Saved successfully” 等
    } catch (err) {
      console.error("Failed to save maxUsers:", err);
      setErrorMsg("Failed to save max users. Please try again.");
    } finally {
      setSavingMax(false);
    }
  };

  // 10. 组件挂载后，先拉一次数据
  useEffect(() => {
    fetchEvents();
    fetchMaxUsers();
  }, [fetchEvents, fetchMaxUsers]);

  return (
    <div className="admin-container">
      {/* ------------ Header 区域 ------------ */}
      <header className="admin-header">
        <div className="header-left">
          <img src={CompanyLogo} alt="Company Logo" className="admin-logo" />
          <h1>Polaris Admin Dashboard</h1>
        </div>
        <button
          className="logout-btn"
          onClick={() => logout({ returnTo: window.location.origin })}
        >
          Log Out
        </button>
      </header>

      {/* ------------ 全局错误提示 ------------ */}
      {errorMsg && (
        <div className="error-banner">
          {errorMsg}
        </div>
      )}

      <main className="admin-main">
        {/* ====== 1. 当前登录事件列表 ====== */}
        <section className="card">
          <h2>1. Current Login Events</h2>
          <p>Unique Users Logged In: {uniqueCount}</p>
          <table className="events-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Email</th>
                <th>When</th>
                <th>Location (IP)</th>
              </tr>
            </thead>
            <tbody>
              {loadingEvents ? (
                <tr>
                  <td colSpan="4" className="cell-loading">
                    Loading...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan="4" className="cell-empty">
                    No login events yet.
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt._id}>
                    <td>{evt.userId}</td>
                    <td>{evt.email}</td>
                    <td>{new Date(evt.timestamp).toLocaleString()}</td>
                    <td>{evt.location}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <button
            className="refresh-btn"
            onClick={fetchEvents}
            disabled={loadingEvents}
          >
            Refresh Now
          </button>
        </section>

        {/* ====== 2. 最大用户数 (Max-Users Limit) ====== */}
        <section className="card">
          <h2>2. Max-Users Limit</h2>
          <p>
            Set how many unique users can log in before new logins are blocked.
          </p>
          <div className="max-users-input-group">
            <label htmlFor="maxUsersInput">Current Unique Count: {uniqueCount}</label>
            <input
              type="number"
              id="maxUsersInput"
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value)}
              disabled={loadingMax || savingMax}
              min="0"
              className="max-users-input"
            />
            <button
              className="save-btn"
              onClick={saveMaxUsers}
              disabled={loadingMax || savingMax}
            >
              {savingMax ? "Saving..." : "Save Limit"}
            </button>
          </div>
          {loadingMax && <div className="small-loading">Loading max users...</div>}
        </section>
      </main>

      {/* 页脚 */}
      <footer className="admin-footer">
        © 2025 Polaris Admin
      </footer>
    </div>
  );
}
