// api/track-login.js
import { MongoClient } from "mongodb";

let cachedClient = null;
async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI environment variable");
    }
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
    }
    const { userId, email, when } = req.body || {};
    if (!userId || !email || !when) {
    return res.status(400).json({ error: "Missing userId, email, or when" });
    }

    try {
    const client = await connectToDatabase();
    const db = client.db("cody_admin"); // ← explicitly target cody_admin
    await db.collection("login_events").insertOne({
        userId,
        email,
        timestamp: new Date(when),
    });
    return res.status(200).json({ success: true });
    } catch (err) {
    console.error("track-login error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
    }
}
