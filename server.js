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

// Database initialization with migration support
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info(cards)", [], (err, columns) => {
      if (err) {
        console.error("Error checking table schema:", err);
        reject(err);
        return;
      }

      if (!columns || columns.length === 0) {
        // Fresh database - create new schema
        console.log("Creating new database schema...");
        db.run(`
          CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categories TEXT,
            studyCount INTEGER DEFAULT 0,
            en_US TEXT,
            es_ES TEXT,
            vi_VN TEXT,
            de_DE TEXT
          )
        `, (err) => {
          if (err) reject(err);
          else {
            console.log("Database schema created successfully.");
            resolve();
          }
        });
      } else {
        // Check existing schema
        const columnNames = columns.map((c) => c.name);
        const hasOldSchema = columnNames.includes("front") && columnNames.includes("back");
        const hasNewSchema = columnNames.includes("en_US");

        if (hasNewSchema) {
          console.log("Database already has new multi-language schema.");
          resolve();
        } else if (hasOldSchema) {
          console.log("Migrating from old schema to new multi-language schema...");

          // Sequential migration
          db.serialize(() => {
            db.run("ALTER TABLE cards ADD COLUMN en_US TEXT");
            db.run("ALTER TABLE cards ADD COLUMN es_ES TEXT");
            db.run("ALTER TABLE cards ADD COLUMN vi_VN TEXT");
            db.run("ALTER TABLE cards ADD COLUMN de_DE TEXT", () => {
              // Now update data after columns exist
              db.run("UPDATE cards SET en_US = front, es_ES = back", (err) => {
                if (err) {
                  console.error("Migration data error:", err);
                  reject(err);
                } else {
                  console.log("Migration complete: front -> en_US, back -> es_ES");
                  resolve();
                }
              });
            });
          });
        } else {
          console.log("Unknown schema state, attempting to add columns...");
          db.serialize(() => {
            db.run("ALTER TABLE cards ADD COLUMN en_US TEXT", () => { });
            db.run("ALTER TABLE cards ADD COLUMN es_ES TEXT", () => { });
            db.run("ALTER TABLE cards ADD COLUMN vi_VN TEXT", () => { });
            db.run("ALTER TABLE cards ADD COLUMN de_DE TEXT", () => {
              resolve();
            });
          });
        }
      }
    });
  });
};

// Create settings table
db.run(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

// Initialize database then start server
initDatabase().then(() => {
  // Get all cards
  app.get("/api/deck", (req, res) => {
    db.all("SELECT * FROM cards ORDER BY id ASC", (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const parsed = rows.map((r) => ({
        id: r.id,
        categories: r.categories ? JSON.parse(r.categories) : [],
        studyCount: r.studyCount || 0,
        en_US: r.en_US || r.front || "",
        es_ES: r.es_ES || r.back || "",
        vi_VN: r.vi_VN || "",
        de_DE: r.de_DE || "",
      }));
      res.json(parsed);
    });
  });

  // Save all cards
  app.post("/api/deck", (req, res) => {
    const deck = Array.isArray(req.body) ? req.body : [];
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      db.run("DELETE FROM cards");
      const stmt = db.prepare(
        "INSERT INTO cards (id, categories, studyCount, en_US, es_ES, vi_VN, de_DE) VALUES (?, ?, ?, ?, ?, ?, ?)"
      );
      for (const c of deck) {
        const id = typeof c.id === "number" ? c.id : null;
        stmt.run(
          id,
          JSON.stringify(c.categories || []),
          c.studyCount || 0,
          c.en_US || c.front || "",
          c.es_ES || c.back || "",
          c.vi_VN || "",
          c.de_DE || ""
        );
      }
      stmt.finalize();
      db.run("COMMIT", (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true, count: deck.length });
      });
    });
  });

  // Get settings
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

  // Save settings
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

  // Get cards with missing translations (paginated)
  app.get("/api/missing-words", (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    // Count total missing
    db.get(
      `SELECT COUNT(*) as total FROM cards 
       WHERE en_US = '' OR en_US IS NULL 
          OR es_ES = '' OR es_ES IS NULL 
          OR vi_VN = '' OR vi_VN IS NULL 
          OR de_DE = '' OR de_DE IS NULL`,
      [],
      (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });

        // Get paginated results
        db.all(
          `SELECT * FROM cards 
           WHERE en_US = '' OR en_US IS NULL 
              OR es_ES = '' OR es_ES IS NULL 
              OR vi_VN = '' OR vi_VN IS NULL 
              OR de_DE = '' OR de_DE IS NULL
           ORDER BY id ASC
           LIMIT ? OFFSET ?`,
          [limit, offset],
          (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            const parsed = rows.map((r) => ({
              id: r.id,
              categories: r.categories ? JSON.parse(r.categories) : [],
              studyCount: r.studyCount || 0,
              en_US: r.en_US || "",
              es_ES: r.es_ES || "",
              vi_VN: r.vi_VN || "",
              de_DE: r.de_DE || "",
            }));
            res.json({
              cards: parsed,
              total: countRow.total,
              page,
              limit,
              totalPages: Math.ceil(countRow.total / limit),
            });
          }
        );
      }
    );
  });

  // Translate text via Google Translate API (proxy)
  app.post("/api/translate", async (req, res) => {
    const { texts, sourceLang, targetLang } = req.body;

    // Use Google Translate free endpoint (limited, good for testing)
    // For production, use official API with key
    try {
      const translations = await Promise.all(
        texts.map(async (text) => {
          if (!text) return "";

          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

          const response = await fetch(url);
          const data = await response.json();

          // Extract translation from Google's response format
          if (data && data[0] && data[0][0] && data[0][0][0]) {
            return data[0][0][0];
          }
          return text;
        })
      );

      res.json({ translations });
    } catch (err) {
      console.error("Translation error:", err);
      res.status(500).json({ error: "Translation failed" });
    }
  });

  // Update a single card
  app.patch("/api/cards/:id", (req, res) => {
    const { id } = req.params;
    const { en_US, es_ES, vi_VN, de_DE, categories } = req.body;

    db.run(
      `UPDATE cards SET 
        en_US = COALESCE(?, en_US),
        es_ES = COALESCE(?, es_ES),
        vi_VN = COALESCE(?, vi_VN),
        de_DE = COALESCE(?, de_DE),
        categories = COALESCE(?, categories)
       WHERE id = ?`,
      [en_US, es_ES, vi_VN, de_DE, categories ? JSON.stringify(categories) : null, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Card not found" });
        res.json({ ok: true, id });
      }
    );
  });

  // Batch update multiple cards
  app.post("/api/cards/batch-update", (req, res) => {
    const { cards } = req.body;
    if (!Array.isArray(cards)) return res.status(400).json({ error: "cards must be an array" });

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      const stmt = db.prepare(
        `UPDATE cards SET en_US = ?, es_ES = ?, vi_VN = ?, de_DE = ? WHERE id = ?`
      );

      for (const c of cards) {
        stmt.run(c.en_US || "", c.es_ES || "", c.vi_VN || "", c.de_DE || "", c.id);
      }

      stmt.finalize();
      db.run("COMMIT", (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true, updated: cards.length });
      });
    });
  });

  const port = process.env.PORT || 3001;
  app.listen(port, () =>
    console.log(`FlashCards API listening on http://localhost:${port}`)
  );
}).catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
