// Reusable guard: extracts and verifies a bearer token via Supabase,
// attaches the verified user to req.user, or rejects with 401.
const { supabase } = require("./supabaseClient");

function extractToken(req) {
  const header = req.headers["authorization"];
  if (!header || typeof header !== "string") return null;

  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) return null;

  return parts[1];
}

async function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = data.user;
  req.token = token;
  next();
}

module.exports = { requireAuth, extractToken };
