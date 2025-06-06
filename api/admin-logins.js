// api/admin-logins.js

import { connectToDatabase } from "../src/utils/mongoDB.js";

export default async function handler(req, res) {
  // 只允许 GET（取所有登录记录）或 DELETE（删除某个 userId 的所有登录记录）
  if (req.method !== "GET" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 解构 connectToDatabase 返回值
  const { db } = await connectToDatabase();

  // GET: 拉取所有 login_events，按 timestamp 倒序
  if (req.method === "GET") {
    try {
      const events = await db
        .collection("login_events")
        .find({})
        .sort({ timestamp: -1 })
        .toArray();
      return res.status(200).json(events);
    } catch (err) {
      console.error("admin-logins GET error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  // DELETE: 根据 userId 清除该 userId 的所有登录记录
  if (req.method === "DELETE") {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    try {
      await db.collection("login_events").deleteMany({ userId });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("admin-logins DELETE error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
}
