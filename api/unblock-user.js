// api/unblock-user.js
import { connectToDatabase } from "../src/utils/mongoDB.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Missing email" });
  const em = email.toLowerCase();

  try {
    const { db } = await connectToDatabase();
    await db.collection("blocked_emails").deleteOne({ _id: em });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("unblock-user error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
