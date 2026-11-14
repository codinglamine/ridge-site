// POST /api/beta  { "password": "..." }  ->  200 { url, file, size } | 401 | 429 | 503
// The password and the installer address live in Vercel environment variables,
// never in the page: BETA_PASSWORD, BETA_URL (and optional BETA_FILE, BETA_SIZE).
const crypto = require("crypto");

const tries = new Map(); // per-instance soft limit: 8 wrong tries per IP per 10 minutes

function same(a, b) {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
  const PASS = process.env.BETA_PASSWORD, URL = process.env.BETA_URL;
  if (!PASS || !URL) return res.status(503).json({ error: "The beta isn't available right now." });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const now = Date.now(), t = tries.get(ip) || { n: 0, at: now };
  if (now - t.at > 10 * 60 * 1000) { t.n = 0; t.at = now; }
  if (t.n >= 8) return res.status(429).json({ error: "Too many tries. Wait a few minutes." });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const given = body && typeof body.password === "string" ? body.password.slice(0, 200) : "";

  if (!given || !same(given, PASS)) {
    t.n += 1; tries.set(ip, t);
    await new Promise((r) => setTimeout(r, 400));
    return res.status(401).json({ error: "That password isn't right." });
  }
  tries.delete(ip);
  return res.status(200).json({
    url: URL,
    file: process.env.BETA_FILE || "RidgeSetup-beta.exe",
    size: process.env.BETA_SIZE || "",
  });
};
