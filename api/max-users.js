// api/max-users.js

/**
 * 该 Serverless 函数负责两件事：
 *   1. GET 方法：返回当前存储在 settings 集合里的 maxUsers（如果 settings 里没有，就返回默认 10）。
 *   2. PUT 方法：接收 { max: <number> }，将 settings 集合的 _id="maxUsers" 文档更新为该数字（不存在则插入新文档）。
 *
 * 注意：
 *   - 请求头必须带 Content-Type: application/json
 *   - PUT 请求的 body JSON 必须形如 { "max": 15 }
 *   - 返回 JSON 均包含 { max: <当前值> } 或 { error: "<消息>" }
 *   - 数据库同样使用 connectToDatabase() 来获取 db 对象。
 */

import { connectToDatabase } from "../src/utils/mongoDB.js";

export default async function handler(req, res) {
    try {
    // 先连接数据库，得到 { db }
    const { db } = await connectToDatabase();

    if (req.method === "GET") {
      // --- GET 请求分支：读取 settings._id="maxUsers" 的 value 并返回 ---
        const settingsDoc = await db
        .collection("settings")
        .findOne({ _id: "maxUsers" });

      // 如果没读到，就默认 10
        const currentMax = settingsDoc ? settingsDoc.value : 10;

        return res.status(200).json({ max: currentMax });
    }

    if (req.method === "PUT") {
      // --- PUT 请求分支：更新 (或插入) settings._id="maxUsers" ---
      // 1) 检查 Content-Type
        if (req.headers["content-type"]?.indexOf("application/json") === -1) {
        return res
            .status(400)
            .json({ error: "Content-Type must be application/json" });
        }

      // 2) 从 body 拿出 newMax
        const { max } = req.body || {};
      // 3) 验证 max 是否存在且为正整数
        const parsed = parseInt(max, 10);
        if (isNaN(parsed) || parsed < 1) {
        return res
            .status(400)
            .json({ error: "Field ‘max’ must be a positive integer" });
        }

      // 4) 执行“更新或插入”逻辑：如果已有该文档，就更新；否则，插入
        await db.collection("settings").updateOne(
        { _id: "maxUsers" },          // 查询条件：文档 _id 为 "maxUsers"
        { $set: { value: parsed } },  // 更新内容：把 value 字段设为 parsed
        { upsert: true }             // upsert: true 会在不存在时插入新文档
        );

      // 5) 返回最新值
        return res.status(200).json({ max: parsed });
    }

    // 其它 HTTP 方法全部返回 405（Method Not Allowed）
    return res
        .status(405)
        .json({ error: `Method Not Allowed. Supported: GET, PUT` });
    } catch (err) {
    console.error("max-users error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
    }
}
