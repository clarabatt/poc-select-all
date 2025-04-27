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
    const dataSql = `SELECT name, description, status, color, assignee FROM items${whereClause} LIMIT ? OFFSET ?`;

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
