import fetch from "node-fetch";

let cache = { token: "", exp: 0 };

async function mgmtToken() {
    const now = Date.now() / 1000;
    if (now < cache.exp - 60) return cache.token;

    const res = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: process.env.MGMT_CLIENT_ID,
        client_secret: process.env.MGMT_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
    }),
    });
    const { access_token, expires_in } = await res.json();
    cache = { token: access_token, exp: now + expires_in };
    return cache.token;
}

export default async function handler(req, res) {
    if (req.method !== "GET") return res.status(405).end();

    const token = await mgmtToken();
    const url =
    `https://${process.env.AUTH0_DOMAIN}/api/v2/users` +
    `?fields=email,name,last_login,logins_count&per_page=100`;
    const data = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());

    res.status(200).json(data);
}
