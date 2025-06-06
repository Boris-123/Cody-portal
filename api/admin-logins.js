// api/admin-logins.js

import { connectToDatabase } from "../src/utils/mongoDB.js";

export default async function handler(req, res) {
  // 连接到 MongoDB
  const client = await connectToDatabase();
  const db = client.db("cody_admin");

  // 只允许 GET 和 DELETE
  if (req.method === "GET") {
    try {
      // 取出所有登录事件，按 timestamp 倒序（最新在前面）
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
  } else if (req.method === "DELETE") {
    // 删除指定 userId 的所有登录事件（释放名额）
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
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
