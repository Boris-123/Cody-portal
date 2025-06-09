// api/track-login.js
import { connectToDatabase } from "../src/utils/mongoDB.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Use POST" });

  const { userId, email, when } = req.body || {};
  if (!userId || !email)
    return res.status(400).json({ error: "Missing userId or email" });

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket.remoteAddress;
  const ts = when ? new Date(when) : new Date();

  try {
    const { db } = await connectToDatabase();
    const em = email.toLowerCase();

    /* --------- 黑名单 ---------- */
    if (await db.collection("blocked_emails").findOne({ _id: em })) {
      return res.status(403).json({ error: "This account is blocked." });
    }

    /* --------- 计算人数 ---------- */
    const uniqueEmails = await db.collection("login_events").distinct("email");
    const uniqueCount = uniqueEmails.length;

    const setting = await db
      .collection("settings")
      .findOne({ _id: "maxusers" });
    const maxUsers = setting ? setting.value : 10;

    if (!uniqueEmails.includes(em) && uniqueCount >= maxUsers) {
      return res
        .status(403)
        .json({ error: `User limit reached (${maxUsers}).` });
    }

    /* --------- 写入记录 ---------- */
    await db.collection("login_events").insertOne({
      userId,
      email: em,
      timestamp: ts,
      location: ip,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("track-login error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
