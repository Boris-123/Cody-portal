// api/whitelist.js

import { connectToDatabase } from "../src/utils/mongoDB.js";

export default async function handler(req, res) {
  // 只允许 GET（取白名单列表）或 PUT（覆盖/新增白名单数组）
  if (req.method !== "GET" && req.method !== "PUT") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 解构 connectToDatabase 返回值
  const { db } = await connectToDatabase();

  // GET: 拉取 settings 集合里 _id = "whitelist" 的 value（数组），如果没有，就空数组
  if (req.method === "GET") {
    try {
      const doc = await db.collection("settings").findOne({ _id: "whitelist" });
      const list = doc ? doc.value : [];
      return res.status(200).json({ whitelist: list });
    } catch (err) {
      console.error("whitelist GET error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  // PUT: body 里传 { whitelist: [ "a@example.com", "b@example.com", … ] }
  if (req.method === "PUT") {
    const { whitelist } = req.body;
    if (!Array.isArray(whitelist)) {
      return res.status(400).json({ error: "Invalid whitelist format" });
    }
    try {
      await db.collection("settings").updateOne(
        { _id: "whitelist" },
        { $set: { value: whitelist } },
        { upsert: true }
      );
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("whitelist PUT error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
}
