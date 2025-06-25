// api/blocked-users.js   ← route:  GET /api/blocked-users
import { connectToDatabase } from "../src/utils/mongoDB.js"; // adjust path if needed

export default async function handler(req, res) {
  /* only GET is allowed */
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    /* 1. open connection */
    const { db } = await connectToDatabase();  // throws if URI/env vars wrong

    /* 2. query collection (projection keeps only _id) */
    const docs = await db
      .collection("blocked_emails")
      .find({}, { projection: { _id: 1 } })
      .toArray();

    /* 3. respond with list */
    return res.status(200).json({ blocked: docs.map((d) => d._id) });
  } catch (err) {
    console.error("GET /api/blocked-users failed:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
