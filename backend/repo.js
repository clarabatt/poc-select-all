import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const sqlite = sqlite3.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your SQLite database file
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
export function getItems(filters) {
  return new Promise((resolve, reject) => {
    let sql = "SELECT name, description, status, color, assignee FROM items";
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

    if (where.length) {
      sql += " WHERE " + where.join(" AND ");
    }

    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
