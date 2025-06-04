// api/admin-logins.js
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
    if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
    const client = await connectToDatabase();
    const db = client.db();
    // Fetch the last 100 login events, sorted by timestamp descending
    const events = await db
        .collection("login_events")
        .find({})
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray();
    return res.status(200).json(events);
    } catch (err) {
    console.error("admin-logins error:", err);
    return res.status(500).json({ error: "Database read failed" });
    }
}
