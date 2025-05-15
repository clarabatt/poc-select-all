import express from "express";
import path from "path";
import { getItems, computeSelection, getItemsByIds } from "./repo.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const frontendPath = path.resolve(__dirname, "../dist");
app.use(express.static(frontendPath));

app.get("/api/items", async (req, res) => {
  try {
    let {
      status = null,
      color = null,
      assignee = null,
      page = "1",
      pageSize = "10",
    } = req.query;

    // Normalize to arrays if not already
    status = status
      ? Array.isArray(status)
        ? status
        : [status]
      : [];
    color = color
      ? Array.isArray(color)
        ? color
        : [color]
      : [];
    assignee = assignee
      ? Array.isArray(assignee)
        ? assignee
        : [assignee]
      : [];

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
  if (!Array.isArray(req.body)) {
    return res
      .status(400)
      .json({ error: "Payload must be an array of actions" });
  }
  try {
    const selectedIds = await computeSelection(req.body);
    const items = await getItemsByIds(selectedIds);
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Fallback to serve `index.html` for non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
