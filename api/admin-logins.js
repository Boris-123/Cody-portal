// api/admin-logins.js

/**
 * 这个 Serverless 函数会在 Vercel/Local 环境中被识别为 /api/admin-logins：
 *
 * 1. 只接受 GET 请求，如果不是 GET 则返回 405。
 * 2. 调用 connectToDatabase() 连接 MongoDB，拿到 db 对象。
 * 3. 从 login_events 集合读取所有文档，按 timestamp 倒序排序（最新的在前面）。
 * 4. 返回 JSON 数组，其中每条记录包含：_id, userId, email, timestamp, location。
 * 5. 如果出现任何错误，则返回 500 和 { error: "Internal Server Error" }。
 *
 * 调用前提：项目根目录下 .env 必须已配置 MONGODB_URI，否则 connectToDatabase 会报错。
 */

import { connectToDatabase } from "../src/utils/mongoDB.js";

export default async function handler(req, res) {
  // 1) 只允许 GET 方法
    if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed, use GET" });
    }

    try {
    // 2) 连接到 MongoDB，connectToDatabase() 已经返回 { client, db }
    const { db } = await connectToDatabase();

    // 3) 拉取所有登录事件，并按 timestamp 倒序排序
    const events = await db
        .collection("login_events")
        .find({})
        .sort({ timestamp: -1 })
        .toArray();

    // 4) 返回数据给前端
    return res.status(200).json(events);
    } catch (err) {
    console.error("admin-logins error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
    }
}
