import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "5mb" }));

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbFile = path.join(dataDir, "flashcards.db");

const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY,
      front TEXT,
      back TEXT,
      categories TEXT,
      studyCount INTEGER
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`
  );
});

app.get("/api/deck", (req, res) => {
  db.all("SELECT * FROM cards ORDER BY id ASC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const parsed = rows.map((r) => ({
      id: r.id,
      front: r.front,
      back: r.back,
      categories: r.categories ? JSON.parse(r.categories) : [],
      studyCount: r.studyCount || 0,
    }));
    res.json(parsed);
  });
});

app.post("/api/deck", (req, res) => {
  const deck = Array.isArray(req.body) ? req.body : [];
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    db.run("DELETE FROM cards");
    const stmt = db.prepare(
      "INSERT INTO cards (id, front, back, categories, studyCount) VALUES (?, ?, ?, ?, ?)"
    );
    for (const c of deck) {
      const id = typeof c.id === "number" ? c.id : null;
      stmt.run(
        id,
        c.front || "",
        c.back || "",
        JSON.stringify(c.categories || []),
        c.studyCount || 0
      );
    }
    stmt.finalize();
    db.run("COMMIT", (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, count: deck.length });
    });
  });
});

app.get("/api/settings", (req, res) => {
  db.get(
    "SELECT value FROM settings WHERE key = ?",
    ["appSettings"],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.json({});
      try {
        const parsed = JSON.parse(row.value);
        return res.json(parsed);
      } catch (e) {
        return res.json({});
      }
    }
  );
});

app.post("/api/settings", (req, res) => {
  const value = JSON.stringify(req.body || {});
  db.run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ["appSettings", value],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    }
  );
});

const port = process.env.PORT || 3001;
app.listen(port, () =>
  console.log(`FlashCards API listening on http://localhost:${port}`)
);
