import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";

const dbPath = path.resolve("./backend/data.db");
console.log(`Database path: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  console.error("Database file not found!");
} else {
  console.log("Database file found!");
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error connecting to the database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

export function getItems(filters, page = 1, pageSize = 10) {
  return new Promise((resolve, reject) => {
    const where = [];
    const params = [];
    if (filters.status && filters.status.length) {
      where.push(`status IN (${filters.status.map(() => "?").join(",")})`);
      params.push(...filters.status);
    }
    if (filters.color && filters.color.length) {
      where.push(`color IN (${filters.color.map(() => "?").join(",")})`);
      params.push(...filters.color);
    }
    if (filters.assignee && filters.assignee.length) {
      where.push(`assignee IN (${filters.assignee.map(() => "?").join(",")})`);
      params.push(...filters.assignee);
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


export async function computeSelection(actions) {
  console.log("Actions:", actions);

  const queryIds = async (filters) => {
    const where = [];
    const params = [];
    if (filters.status && filters.status.length) {
      where.push(`status IN (${filters.status.map(() => "?").join(",")})`);
      params.push(...filters.status);
    }
    if (filters.color && filters.color.length) {
      where.push(`color IN (${filters.color.map(() => "?").join(",")})`);
      params.push(...filters.color);
    }
    if (filters.assignee && filters.assignee.length) {
      where.push(`assignee IN (${filters.assignee.map(() => "?").join(",")})`);
      params.push(...filters.assignee);
    }
    const sql = `SELECT id FROM items${where.length ? " WHERE " + where.join(" AND ") : ""}`;
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
