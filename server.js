import express from "express";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config(); // loads DATABASE_URL from .env
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = "supersecret123";
const ADMIN_KEY = "ultrasecret456";

// Create a Postgres connection pool (Neon requires SSL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());

// --- GET all items ---
app.get("/items", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM items ORDER BY createdAt DESC");
  res.json(rows);
});

// --- POST new item ---
app.post("/items", async (req, res) => {
  const key = req.headers["x-api-key"];
  if (key !== API_KEY) return res.status(401).json({ error: "Unauthorized" });

  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Missing required fields: name and email" });
  }

  const id = uuidv4().split("-")[0];
  const createdAt = new Date().toISOString();

  await pool.query(
    "INSERT INTO items (id, name, email, createdAt) VALUES ($1, $2, $3, $4)",
    [id, name, email, createdAt]
  );

  const { rows } = await pool.query("SELECT * FROM items ORDER BY createdAt DESC");
  res.json({ success: true, items: rows });
});

// --- DELETE item by ID ---
app.delete("/items/:id", async (req, res) => {
  const key = req.headers["x-api-key"];
  if (key !== API_KEY) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.params;
  const result = await pool.query("DELETE FROM items WHERE id = $1", [id]);

  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Item not found" });
  }

  const { rows } = await pool.query("SELECT * FROM items ORDER BY createdAt DESC");
  res.json({ success: true, items: rows });
});

// --- NUKE (delete all items) ---
app.delete("/nuke", async (req, res) => {
  const key = req.headers["x-admin-key"];
  if (key !== ADMIN_KEY) return res.status(401).json({ error: "Unauthorized" });

  await pool.query("DELETE FROM items");
  res.json({ success: true, message: "💣 All items deleted." });
});

app.listen(PORT, () => console.log(`✅ API running on http://localhost:${PORT}`));
