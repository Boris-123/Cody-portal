// -------------------------------
// api/whitelist.js
// -------------------------------

import { connectToDatabase } from "../src/utils/mongoDB.js";

export default async function handler(req, res) {
  const client = await connectToDatabase();
  const db = client.db("cody_admin");

  if (req.method === "GET") {
    try {
      const doc = await db.collection("settings").findOne({ _id: "whitelist" });
      const list = doc ? doc.value : [];
      return res.status(200).json({ whitelist: list });
    } catch (err) {
      console.error("whitelist GET error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  } else if (req.method === "PUT") {
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
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
