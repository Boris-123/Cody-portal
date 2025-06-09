// api/block-user.js
import { connectToDatabase } from "../src/utils/mongoDB.js";

export default async function handler(req, res) {
  const { method } = req;

  if (!["POST", "DELETE", "GET"].includes(method))
    return res.status(405).json({ error: "Method Not Allowed" });

  const { email } = req.body || req.query || {};
  const em = email ? email.toLowerCase() : null;

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("blocked_emails");

    /* ============ POST -> Block ============ */
    if (method === "POST") {
      if (!em) return res.status(400).json({ error: "Missing email" });

      // upsert 到黑名单
      await col.updateOne(
        { _id: em },
        { $set: { blockedAt: new Date() } },
        { upsert: true }
      );
      // 清理 login_events，立即释放名额
      await db.collection("login_events").deleteMany({ email: em });
      return res.status(200).json({ success: true });
    }

    /* ============ DELETE -> Unblock ============ */
    if (method === "DELETE") {
      if (!em) return res.status(400).json({ error: "Missing email" });

      await col.deleteOne({ _id: em });
      return res.status(200).json({ success: true });
    }

    /* ============ GET -> 列表 ============ */
    // 返回形如 { blocked: ["a@x.com", "b@x.com"] }
    const docs = await col.find({}).toArray();
    return res.status(200).json({ blocked: docs.map((d) => d._id) });
  } catch (err) {
    console.error("block-user error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
