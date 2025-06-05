import React, { useEffect, useState, useCallback } from "react";
import "./Admin.css";                             // 引入配套的样式文件
import CompanyLogo from "./assets/logolatest.jpg"; // 引入公司 Logo

/**
 * Admin 组件
 * 
 * 功能：
 *   1. 显示顶部横幅，包括公司 Logo、标题和“Log Out”按钮。
 *   2. 调用 GET /api/admin-logins 获取所有登录事件, 渲染表格并计算 unique user 数量。
 *   3. 调用 GET /api/max-users 获取当前 maxUsers 限制, 显示在输入框里。
 *   4. 点击“Refresh Now”按钮, 手动刷新登录事件列表。
 *   5. 修改 maxUsers 并点击“Save Limit”按钮, PUT /api/max-users 提交新值。
 *   6. 显示加载中状态及错误提示。
 */
export default function Admin() {
  // --- 状态声明 ---
  const [events, setEvents] = useState([]);           // 存储所有登录事件
  const [uniqueCount, setUniqueCount] = useState(0);  // 去重后不同 userId 的数量
  const [maxUsers, setMaxUsers] = useState("");       // 当前后台保存的最大用户数（字符串形式）
  const [loadingEvents, setLoadingEvents] = useState(false); // 是否加载登录事件列表
  const [loadingMax, setLoadingMax] = useState(false);       // 是否加载 maxUsers
  const [savingMax, setSavingMax] = useState(false);         // 是否正在保存新的 maxUsers
  const [errorMsg, setErrorMsg] = useState("");              // 全局错误提示

  // --- 拉取所有登录事件 ---
  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    setErrorMsg("");
    try {
      const resp = await fetch("/api/admin-logins");
      if (!resp.ok) {
        throw new Error(`Status ${resp.status}`);
      }
      const data = await resp.json(); 
      setEvents(data);

      // 计算 unique userId 数量
      const uniqueSet = new Set(data.map(evt => evt.userId));
      setUniqueCount(uniqueSet.size);
    } catch (err) {
      console.error("Failed to fetch login events:", err);
      setErrorMsg("获取登录事件失败，请稍后重试。");
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  // --- 拉取当前 maxUsers ---
  const fetchMaxUsers = useCallback(async () => {
    setLoadingMax(true);
    setErrorMsg("");
    try {
      const resp = await fetch("/api/max-users");
      if (!resp.ok) {
        throw new Error(`Status ${resp.status}`);
      }
      const body = await resp.json(); // 期望 { max: number }
      setMaxUsers(body.max.toString());
    } catch (err) {
      console.error("Failed to fetch maxUsers:", err);
      setErrorMsg("获取最大用户数失败，请稍后重试。");
    } finally {
      setLoadingMax(false);
    }
  }, []);

  // --- 保存新的 maxUsers ---
  const saveMaxUsers = async () => {
    // 先校验输入：一定要是大于 0 的整数
    const parsed = parseInt(maxUsers, 10);
    if (isNaN(parsed) || parsed < 1) {
      setErrorMsg("请输入大于 0 的整数作为最大用户数。");
      return;
    }
    setSavingMax(true);
    setErrorMsg("");
    try {
      const resp = await fetch("/api/max-users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max: parsed }),
      });
      const body = await resp.json();
      if (!resp.ok) {
        throw new Error(body.error || `Status ${resp.status}`);
      }
      setMaxUsers(body.max.toString());
      alert(`最大用户数已更新为 ${body.max}`);
    } catch (err) {
      console.error("Failed to save maxUsers:", err);
      setErrorMsg("保存最大用户数失败，请检查输入或稍后重试。");
    } finally {
      setSavingMax(false);
    }
  };

  // --- 组件挂载时先执行一次拉取操作 ---
  useEffect(() => {
    fetchEvents();
    fetchMaxUsers();
  }, [fetchEvents, fetchMaxUsers]);

  // --- 每隔 30 秒自动刷新登录事件列表 ---
  useEffect(() => {
    const id = setInterval(fetchEvents, 30000);
    return () => clearInterval(id);
  }, [fetchEvents]);

  return (
    <div className="admin-container">
      {/* ---------------- 头部 ---------------- */}
      <header className="admin-header">
        <div className="header-left">
          <img src={CompanyLogo} alt="Company Logo" className="admin-logo" />
          <h1>Polaris Admin Dashboard</h1>
        </div>
        <button
          className="logout-btn"
          onClick={() => {
            // 此处改为你自己的 Auth0 logout 或者跳回登录页
            window.location.href = "/";
          }}
        >
          Log Out
        </button>
      </header>

      {/* ---------------- 主内容 ---------------- */}
      <main className="admin-main">
        {errorMsg && <div className="admin-feedback error">{errorMsg}</div>}

        {/* ------ 区块1：登录事件 & Unique Count ------ */}
        <section className="admin-section">
          <h2>1. 当前登录事件</h2>
          {loadingEvents ? (
            <div className="admin-feedback loading">加载中…</div>
          ) : (
            <>
              <p>
                <strong>Unique Users Logged In:</strong> {uniqueCount}
              </p>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Email</th>
                    <th>When</th>
                    <th>Location (IP)</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((evt, idx) => (
                    <tr key={idx}>
                      <td>{evt.userId}</td>
                      <td>{evt.email}</td>
                      <td>{new Date(evt.timestamp).toLocaleString()}</td>
                      <td>{evt.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                className="refresh-btn"
                onClick={fetchEvents}
                disabled={loadingEvents}
              >
                {loadingEvents ? "刷新中…" : "Refresh Now"}
              </button>
            </>
          )}
        </section>

        {/* ------ 区块2：Max-Users 设置 ------ */}
        <section className="admin-section">
          <h2>2. 最大用户数 (Max-Users Limit)</h2>
          {loadingMax ? (
            <div className="admin-feedback loading">正在加载当前限制…</div>
          ) : (
            <>
              <p>
                设置多少个 <em>unique users</em> 登录后，新登录才会被阻止。<br />
                (当前 Unique Count: <strong>{uniqueCount}</strong>)
              </p>
              <div className="max-users-control">
                <input
                  type="number"
                  min="1"
                  value={maxUsers}
                  onChange={(e) => setMaxUsers(e.target.value)}
                  disabled={savingMax}
                />
                <button
                  className="save-btn"
                  onClick={saveMaxUsers}
                  disabled={savingMax}
                >
                  {savingMax ? "Saving…" : "Save Limit"}
                </button>
              </div>
            </>
          )}
        </section>
      </main>

      {/* ---------------- 页脚 ---------------- */}
      <footer className="admin-footer">
        &copy; {new Date().getFullYear()} Polaris Admin
      </footer>
    </div>
  );
}
