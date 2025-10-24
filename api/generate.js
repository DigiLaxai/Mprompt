// Minimal Vercel serverless proxy supporting Vertex (Google) service account or generic bearer-token providers.
// Set env vars in Vercel: MASTER_API_KEY, and either GOOGLE_SERVICE_ACCOUNT + VERTEX_* vars,
// or PROVIDER_API_URL + PROVIDER_API_KEY.

import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

export default async function handler(req, res) {
  // Simple CORS headers - adjust for production
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const clientKey = (req.headers["x-api-key"] || req.headers["authorization"] || "").toString();
  const MASTER_API_KEY = process.env.MASTER_API_KEY || "";

  if (MASTER_API_KEY && clientKey !== MASTER_API_KEY) {
    return res.status(401).json({ error: "Missing/invalid client key" });
  }

  // Basic prompt validation
  const body = req.body || {};
  if (!body.prompt || typeof body.prompt !== "string" || body.prompt.length > 2000) {
    return res.status(400).json({ error: "Invalid prompt" });
  }

  // Determine provider path: Vertex (Google) if GOOGLE_SERVICE_ACCOUNT present, else generic provider
  try {
    let providerUrl = process.env.PROVIDER_API_URL || process.env.VERTEX_MODEL_ENDPOINT;
    let headers = { "Content-Type": "application/json" };

    if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      // Use google-auth-library to get an access token
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
      const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
      const client = await auth.getClient();
      const accessTokenResponse = await client.getAccessToken();
      const accessToken = (accessTokenResponse && accessTokenResponse.token) || accessTokenResponse;
      if (!accessToken) throw new Error("Failed to obtain Google access token from service account.");
      headers["Authorization"] = `Bearer ${accessToken}`;

      if (!providerUrl) {
        // Try to build a Vertex endpoint from project/location/model environment vars if VERTEX_MODEL_ENDPOINT not provided
        const project = process.env.VERTEX_PROJECT_ID;
        const location = process.env.VERTEX_LOCATION;
        const model = process.env.VERTEX_MODEL; // optional; user may set VERTEX_MODEL instead
        if (!project || !location || !model) {
          return res.status(500).json({ error: "Missing VERTEX_PROJECT_ID, VERTEX_LOCATION, or VERTEX_MODEL (or set VERTEX_MODEL_ENDPOINT)" });
        }
        providerUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:predict`;
      }
    } else {
      // Generic bearer-token provider (Hugging Face, Replicate, Stability)
      const providerKey = process.env.PROVIDER_API_KEY;
      if (!providerUrl) {
        return res.status(500).json({ error: "Server missing PROVIDER_API_URL" });
      }
      if (providerKey) headers["Authorization"] = `Bearer ${providerKey}`;
    }

    // Forward body to provider
    const providerRes = await fetch(providerUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      timeout: 120000 // 120s timeout; Vercel functions may still time out earlier on free tier
    });

    const text = await providerRes.text();
    const status = providerRes.status;

    try {
      const json = JSON.parse(text);
      return res.status(status).json(json);
    } catch (e) {
      return res.status(status).send(text);
    }
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(502).json({ error: "Proxy error", message: String(err) });
  }
}
