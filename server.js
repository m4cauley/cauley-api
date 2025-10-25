import express from "express";
import fs from "fs";
import { v4 as uuidv4 } from "uuid"; // UUID generator

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = "./data.json";
const API_KEY = "chib"; // change this to your own key

// Allow JSON body parsing
app.use(express.json());

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));

/* -------------------------------
   ROUTES
--------------------------------*/

// ✅ GET all items
app.get("/items", (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  res.json(data);
});

// ✅ GET a single item by ID
app.get("/items/:id", (req, res) => {
  const { id } = req.params;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  const item = data.find(i => i.id === id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  res.json(item);
});

// ✅ POST new item (protected + strict validation)
app.post("/items", (req, res) => {
  const key = req.headers["x-api-key"];
  if (key !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized — invalid or missing API key" });
  }

  // Strict validation — only 'name' and 'email' allowed
  const allowedKeys = ["name", "email"];
  const bodyKeys = Object.keys(req.body);

  // Missing required fields
  if (!req.body.name || !req.body.email) {
    return res
      .status(400)
      .json({ error: "Missing required fields: 'name' and 'email' are mandatory." });
  }

  // Extra unexpected fields
  const hasExtraFields = bodyKeys.some(key => !allowedKeys.includes(key));
  if (hasExtraFields) {
    return res.status(400).json({ error: "Only 'name' and 'email' are allowed fields." });
  }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

  const newItem = {
    // 🔹 Generate short 8-char ID (first UUID segment)
    id: uuidv4().split("-")[0],
    name: req.body.name,
    email: req.body.email,
    createdAt: new Date().toISOString(),
  };

  data.push(newItem);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  res.json({ success: true, item: newItem });
});

// ✅ DELETE item by ID (protected)
app.delete("/items/:id", (req, res) => {
  const key = req.headers["x-api-key"];
  if (key !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized — invalid or missing API key" });
  }

  const { id } = req.params;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  const newData = data.filter(item => item.id !== id);

  if (newData.length === data.length) {
    return res.status(404).json({ error: "Item not found" });
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(newData, null, 2));
  res.json({ success: true, message: `Item ${id} deleted`, items: newData });
});

// ✅ NUKE endpoint — wipes all data (requires separate admin key)
const ADMIN_KEY = "launch-codes"; // choose something strong and different from API_KEY

app.delete("/nuke", (req, res) => {
  const key = req.headers["x-admin-key"];
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: "You aren't allowed to touch this!" });
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
  res.json({ success: true, message: "💣 All items deleted. The database is now empty." });
});


/* -------------------------------
   SERVER START
--------------------------------*/
app.listen(PORT, () => console.log(`✅ API running on http://localhost:${PORT}`));
