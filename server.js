import express from "express";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pg from "pg";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "10mb" }));

/* ── Database ──────────────────────────────────────────────────────────── */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Ensure the table exists on startup
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS household_data (
      key  TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("Database ready.");
}

initDb().catch((err) => console.error("DB init error:", err));

/* ── Data API ──────────────────────────────────────────────────────────── */

const DATA_KEY = "household-data";

app.get("/api/data", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT data FROM household_data WHERE key = $1",
      [DATA_KEY]
    );
    res.json(result.rows[0]?.data ?? null);
  } catch (err) {
    console.error("GET /api/data error:", err);
    res.status(500).json({ error: "Failed to load data." });
  }
});

app.post("/api/data", async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO household_data (key, data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET data = $2, updated_at = NOW()`,
      [DATA_KEY, req.body]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/data error:", err);
    res.status(500).json({ error: "Failed to save data." });
  }
});

/* ── Anthropic proxy ───────────────────────────────────────────────────── */

app.post("/api/claude", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured on the server." });
  }
  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: "Failed to reach Anthropic API." });
  }
});

/* ── Static frontend ───────────────────────────────────────────────────── */

app.use(express.static(join(__dirname, "dist")));
app.get("*", (_req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

/* ── Start ─────────────────────────────────────────────────────────────── */

const PORT = process.env.PORT || 3001;
createServer(app).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
