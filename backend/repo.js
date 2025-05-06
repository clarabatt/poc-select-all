import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const sqlite = sqlite3.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "data.db");
console.log("DB path:", dbPath);
const db = new sqlite.Database(dbPath, sqlite.OPEN_READWRITE, (err) => {
  if (err) console.error("DB connection error:", err);
  else console.log("Connected to SQLite.");
});

/**
 * Fetch items applying optional filters
 * @param {{ status?: string, color?: string, assignee?: string }} filters
 * @returns {Promise<Array>}
 */
export function getItems(filters, page = 1, pageSize = 10) {
  return new Promise((resolve, reject) => {
    const where = [];
    const params = [];
    if (filters.status) {
      where.push("status = ?");
      params.push(filters.status);
    }
    if (filters.color) {
      where.push("color = ?");
      params.push(filters.color);
    }
    if (filters.assignee) {
      where.push("assignee = ?");
      params.push(filters.assignee);
    }

    const whereClause = where.length ? " WHERE " + where.join(" AND ") : "";
    const countSql = `SELECT COUNT(*) as total FROM items${whereClause}`;
    const offset = (page - 1) * pageSize;
    const dataSql = `SELECT id, name, description, status, color, assignee FROM items${whereClause} LIMIT ? OFFSET ?`;

    db.get(countSql, params, (err, row) => {
      if (err) return reject(err);
      const total = row.total;
      db.all(dataSql, [...params, pageSize, offset], (err2, rows) => {
        if (err2) return reject(err2);
        resolve({ items: rows, total });
      });
    });
  });
}

export async function getItemsByIds(ids) {
  const CHUNK_SIZE = 900;
  const chunks = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE)
    chunks.push(ids.slice(i, i + CHUNK_SIZE));

  const allRows = [];
  for (const c of chunks) {
    const q = `SELECT id, name, description, status, color, assignee
               FROM items WHERE id IN (${c.map(() => "?").join(",")})`;
    const rows = await new Promise((res, rej) =>
      db.all(q, c, (e, r) => (e ? rej(e) : res(r)))
    );
    allRows.push(...rows);
  }
  return allRows;
}

/**
 * Replay a list of actions to compute the final selected IDs.
 * @param {Array} actions
 * @returns {Promise<number[]>} array of selected item IDs
 */
export async function computeSelection(actions) {
  const queryIds = async (filters) => {
    const where = [];
    const params = [];
    if (filters.status) {
      where.push("status   = ?");
      params.push(filters.status);
    }
    if (filters.color) {
      where.push("color    = ?");
      params.push(filters.color);
    }
    if (filters.assignee) {
      where.push("assignee = ?");
      params.push(filters.assignee);
    }
    const sql = `SELECT id FROM items${
      where.length ? " WHERE " + where.join(" AND ") : ""
    }`;
    const rows = await new Promise((res, rej) =>
      db.all(sql, params, (e, r) => (e ? rej(e) : res(r)))
    );
    return rows.map((r) => r.id);
  };

  const selected = new Set();

  for (const act of actions) {
    switch (act.action) {
      case "select_all": {
        const ids = await queryIds(act.filters);
        ids.forEach((id) => selected.add(id));
        break;
      }
      case "deselect_all": {
        const ids = await queryIds(act.filters);
        ids.forEach((id) => selected.delete(id));
        break;
      }
      case "partial_add": {
        act.ids.forEach((id) => selected.add(id));
        break;
      }
      case "partial_remove": {
        act.ids.forEach((id) => selected.delete(id));
        break;
      }
    }
  }
  return Array.from(selected);
}
