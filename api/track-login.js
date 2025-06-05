// api/track-login.js

/**
 * 这个文件会被 Vercel 识别成 Serverless 函数，路径 => /api/track-login
 *
 * 功能：
 *   1. 只接受 POST 请求，body 必须是 JSON 格式，至少包含 { userId, email, when? }
 *   2. 从 req.headers["x-forwarded-for"] 或 req.socket.remoteAddress 获得客户端 IP（location）
 *   3. 调用 connectToDatabase() 连接 MongoDB，拿到 { db }
 *   4. 从 login_events 集合里读出所有文档，计算已有的 unique userId 数量
 *   5. 从 settings 集合里读 _id="maxUsers" 的文档，取出 value 作为 maxUsers（默认 10）
 *   6. 如果当前 userId 不在 uniqueUsersSet 且 uniqueCount ≥ maxUsers，则拒绝登录 (403)
 *   7. 否则，把这次登录信息插入 login_events（包括: userId, email, timestamp, location/IP）
 *   8. 返回 { success: true }；如果发生任何异常，则返回 500 错误
 *
 * 注意：项目根目录的 `.env` 里 **一定要** 设置 MONGODB_URI，否则 connectToDatabase 会报错。
 */

import { connectToDatabase } from "../src/utils/mongoDB.js";

export default async function handler(req, res) {
  // 1) 只允许 POST 方法：
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed, use POST" });
  }

  // 2) 从请求 body 拿 userId, email, when:
  const { userId, email, when } = req.body || {};

  // 3) userId & email 必填，否则 400:
  if (!userId || !email) {
    return res
      .status(400)
      .json({ error: "Missing userId or email in request body" });
  }

  // 4) 从请求头取真实客户端 IP（x-forwarded-for 优先，否则 req.socket.remoteAddress）
  const xForwardedFor = req.headers["x-forwarded-for"];
  const clientIp = xForwardedFor
    ? xForwardedFor.split(",")[0].trim()
    : req.socket.remoteAddress;

  // 5) 解析 timestamp: 如果前端没传 when，就用当前时间
  const loginTimestamp = when ? new Date(when) : new Date();

  try {
    // 6) 连接数据库，拿到 { db }
    const { db } = await connectToDatabase();

    // 7) 先读 login_events 集合里所有文档，计算 unique userId 数量
    const allEvents = await db.collection("login_events").find({}).toArray();
    const uniqueUsersSet = new Set(allEvents.map((evt) => evt.userId));
    const uniqueCount = uniqueUsersSet.size;

    // 8) 再读 settings 集合里取 { _id: "maxUsers" } 的那条文档，拿出 value 作为 maxUsers
    //    如果没存的话，默认 10
    const settingsDoc = await db
      .collection("settings")
      .findOne({ _id: "maxUsers" });
    const maxUsers = settingsDoc ? settingsDoc.value : 10;

    // 9) 如果当前 userId 不在 uniqueUsersSet 且 uniqueCount >= maxUsers，则拒绝登录 → 403
    if (!uniqueUsersSet.has(userId) && uniqueCount >= maxUsers) {
      return res
        .status(403)
        .json({ error: `User limit reached (${maxUsers}). No new logins allowed.` });
    }

    // 10) 否则，把这次登录信息插入 login_events (userId, email, timestamp, location)
    await db.collection("login_events").insertOne({
      userId,
      email,
      timestamp: loginTimestamp,
      location: clientIp,
    });

    // 11) 返回成功
    return res.status(200).json({ success: true });
  } catch (err) {
    // 12) 如果任何一步出错，打印日志，并返回 500
    console.error("track-login error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
