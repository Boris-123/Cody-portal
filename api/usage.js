// api/usage.js
import { MongoClient } from "mongodb";

let cachedClient = null;
async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    });
    await client.connect();
    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
  // Only allow POST
    if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
    } 

  // Expect the front end to send { userId, email, message }
    const { userId, email, message } = req.body || {};
    if (!userId || !email) {
    return res.status(400).json({ error: "Missing userId or email" });
    }

    try {
    const client = await connectToDatabase();
    const db = client.db();
    await db.collection("usage_events").insertOne({
        userId,
        email,
        message: message || "",
        timestamp: new Date(),
    });
    return res.status(200).json({ success: true });
    } catch (err) {
    console.error("usage error:", err);
    return res.status(500).json({ error: "Database write failed" });
    }
}
