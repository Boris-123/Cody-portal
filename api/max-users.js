// api/max-users.js

import { connectToDatabase } from "../src/utils/mongoDB.js";

export default async function handler(req, res) {
  // 只允许 GET（拉 maxUsers）或 PUT（设置新的 maxUsers）
  if (req.method !== "GET" && req.method !== "PUT") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 解构 connectToDatabase 返回值
  const { db } = await connectToDatabase();

  // GET: 拉 settings 集合里 _id = "maxUsers" 的 value（数值），默认 10
  if (req.method === "GET") {
    try {
      const doc = await db.collection("settings").findOne({ _id: "maxUsers" });
      const max = doc ? doc.value : 10;
      return res.status(200).json({ max });
    } catch (err) {
      console.error("max-users GET error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  // PUT: body 里传 { max: 50 } 这种
  if (req.method === "PUT") {
    const { max } = req.body;
    if (typeof max !== "number") {
      return res.status(400).json({ error: "Invalid max value" });
    }
    try {
      await db.collection("settings").updateOne(
        { _id: "maxUsers" },
        { $set: { value: max } },
        { upsert: true }
      );
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("max-users PUT error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
}
