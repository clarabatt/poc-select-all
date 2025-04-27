import express from "express";
import path from "path";
import { getItems, computeSelection, getItemsByIds } from "./repo.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

app.get("/api/items", async (req, res) => {
  try {
    const {
      status = null,
      color = null,
      assignee = null,
      page = "1",
      pageSize = "10",
    } = req.query;

    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);

    const { items, total } = await getItems(
      { status, color, assignee },
      pageNum,
      pageSizeNum
    );

    res.json({
      items,
      totalRecords: total,
    });
  } catch (err) {
    console.error("GET /api/items error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/items/selection", async (req, res) => {
  try {
    const actions = req.body;
    if (!Array.isArray(actions)) {
      return res.status(400).json({ error: "Expected actions array" });
    }
    const selectedIds = await computeSelection(actions);

    const items = await getItemsByIds(selectedIds);
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
