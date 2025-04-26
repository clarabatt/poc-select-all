import express from "express";
import cors from "cors";
import { getItems } from "./repo.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/**
 * GET /api/items?status=&color=&assignee=
 */
app.get("/api/items", async (req, res) => {
  const filters = {
    status: req.query.status || null,
    color: req.query.color || null,
    assignee: req.query.assignee || null,
  };
  try {
    const items = await getItems(filters);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
