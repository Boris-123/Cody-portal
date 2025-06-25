// api/block-user.js      ← route:  POST /api/block-user
import { connectToDatabase } from "../src/utils/mongoDB.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Missing email" });
  const em = email.toLowerCase();

  try {
    const { db } = await connectToDatabase();

    /* upsert into blacklist */
    await db.collection("blocked_emails").updateOne(
      { _id: em },
      { $set: { blockedAt: new Date() } },
      { upsert: true }
    );

    /* immediately purge login events so slot is freed */
    await db.collection("login_events").deleteMany({ email: em });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("POST /api/block-user failed:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
