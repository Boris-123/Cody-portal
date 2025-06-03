// api/track.ts
import { kv } from '@vercel/kv';     // built-in KV storage

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

  const { user, ev, len, t } = req.body;            // ev = widget_loaded | user_msg
    await kv.rpush(`cody:${user}`, JSON.stringify({ ev, len, t }));
    res.status(204).end();
}
