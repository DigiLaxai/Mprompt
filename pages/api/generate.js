// pages/api/generate.js
// Serverless proxy for Vertex (Gemini) or generic bearer-token providers.
// Requires Vercel env vars: MASTER_API_KEY, GOOGLE_SERVICE_ACCOUNT, VERTEX_PROJECT_ID, VERTEX_LOCATION, VERTEX_MODEL (or VERTEX_MODEL_ENDPOINT)
// If you don't use Google, set PROVIDER_API_URL and PROVIDER_API_KEY instead.

let GoogleAuth;
try {
  GoogleAuth = require("google-auth-library").GoogleAuth;
} catch (e) {
  GoogleAuth = null;
}

module.exports = async (req, res) => {
  // CORS (tighten for production)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  const MASTER_API_KEY = process.env.MASTER_API_KEY || "";
  const clientKey = (req.headers["x-api-key"] || req.headers["authorization"] || "").toString();
  if (MASTER_API_KEY && clientKey !== MASTER_API_KEY) {
    return res.status(401).json({ error: "Missing/invalid client key" });
  }

  const body = req.body || {};
  if (!body.prompt || typeof body.prompt !== "string") {
    return res.status(400).json({ error: "Request must include prompt string" });
  }

  try {
    let providerUrl = process.env.PROVIDER_API_URL || process.env.VERTEX_MODEL_ENDPOINT || "";
    const headers = { "Content-Type": "application/json" };

    if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      if (!GoogleAuth) {
        return res.status(500).json({ error: "Server missing dependency google-auth
