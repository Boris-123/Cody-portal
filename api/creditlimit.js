import { connectToDatabase } from "../src/utils/mongoDB.js";

export default async function handler(req, res) {
  const { method } = req;
  const { db } = await connectToDatabase();
  const col = db.collection("credit_limits");

  if (method === "GET") {
    const limits = await col.find({}).toArray();
    return res.status(200).json({ limits });
  }

  if (method === "PUT") {
    const { email, monthlyLimit } = req.body || {};
    if (!email || typeof monthlyLimit !== "number")
      return res.status(400).json({ error: "Bad payload" });
    await col.updateOne(
      { _id: email.toLowerCase() },
      { $set: { monthlyLimit } },
      { upsert: true }
    );
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: "Method Not Allowed" });
}
