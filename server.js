import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import http from "http";

// ─── Promisified HTTP helper (replaces fetch() for Node < 18) ───────────────
function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}


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

// Create stories table
db.run(`
  CREATE TABLE IF NOT EXISTS stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create story_lines table
db.run(`
  CREATE TABLE IF NOT EXISTS story_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL,
    line_order INTEGER NOT NULL,
    en_US TEXT,
    es_ES TEXT,
    vi_VN TEXT,
    de_DE TEXT,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
  )
`);

// Create saved_tests table (generated tests that can be retaken)
db.run(`
  CREATE TABLE IF NOT EXISTS saved_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    level TEXT NOT NULL,
    skills TEXT NOT NULL,
    questions TEXT NOT NULL,
    ollama_model TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create test_sessions table (one row per attempt at a saved test)
db.run(`
  CREATE TABLE IF NOT EXISTS test_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    saved_test_id INTEGER NOT NULL,
    score INTEGER,
    max_score INTEGER,
    answers TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  // ========== STORIES API ==========

  // Get all stories (with line count)
  app.get("/api/stories", (req, res) => {
    db.all(
      `SELECT s.*, COUNT(sl.id) as line_count 
       FROM stories s 
       LEFT JOIN story_lines sl ON s.id = sl.story_id 
       GROUP BY s.id 
       ORDER BY s.created_at DESC`,
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
      }
    );
  });

  // Create a new story with lines
  app.post("/api/stories", (req, res) => {
    const { name, category, lines } = req.body;
    if (!name) return res.status(400).json({ error: "Story name is required" });

    db.run(
      "INSERT INTO stories (name, category) VALUES (?, ?)",
      [name, category || "General"],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        const storyId = this.lastID;

        if (lines && Array.isArray(lines) && lines.length > 0) {
          const stmt = db.prepare(
            "INSERT INTO story_lines (story_id, line_order, en_US, es_ES, vi_VN, de_DE) VALUES (?, ?, ?, ?, ?, ?)"
          );

          lines.forEach((line, index) => {
            stmt.run(
              storyId,
              index + 1,
              line.en_US || "",
              line.es_ES || "",
              line.vi_VN || "",
              line.de_DE || ""
            );
          });

          stmt.finalize((err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ ok: true, id: storyId, lineCount: lines.length });
          });
        } else {
          res.json({ ok: true, id: storyId, lineCount: 0 });
        }
      }
    );
  });

  // Get a single story with all its lines
  app.get("/api/stories/:id", (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM stories WHERE id = ?", [id], (err, story) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!story) return res.status(404).json({ error: "Story not found" });

      db.all(
        "SELECT * FROM story_lines WHERE story_id = ? ORDER BY line_order ASC",
        [id],
        (err, lines) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ ...story, lines: lines || [] });
        }
      );
    });
  });

  // Delete a story (cascade deletes lines)
  app.delete("/api/stories/:id", (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM story_lines WHERE story_id = ?", [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });

      db.run("DELETE FROM stories WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Story not found" });
        res.json({ ok: true });
      });
    });
  });

  // Update a story (name, category, and optionally replace all lines)
  app.patch("/api/stories/:id", (req, res) => {
    const { id } = req.params;
    const { name, category, lines } = req.body;

    db.run(
      `UPDATE stories SET 
        name = COALESCE(?, name),
        category = COALESCE(?, category)
       WHERE id = ?`,
      [name, category, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Story not found" });

        if (lines && Array.isArray(lines)) {
          // Replace all lines
          db.run("DELETE FROM story_lines WHERE story_id = ?", [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const stmt = db.prepare(
              "INSERT INTO story_lines (story_id, line_order, en_US, es_ES, vi_VN, de_DE) VALUES (?, ?, ?, ?, ?, ?)"
            );

            lines.forEach((line, index) => {
              stmt.run(id, index + 1, line.en_US || "", line.es_ES || "", line.vi_VN || "", line.de_DE || "");
            });

            stmt.finalize((err) => {
              if (err) return res.status(500).json({ error: err.message });
              res.json({ ok: true, id, lineCount: lines.length });
            });
          });
        } else {
          res.json({ ok: true, id });
        }
      }
    );
  });

  // ========== OLLAMA PROXY ==========

  // List available Ollama models
  app.get("/api/ollama/models", async (req, res) => {
    try {
      const result = await httpRequest({ host: "127.0.0.1", port: 11434, path: "/api/tags", method: "GET" });
      if (result.status !== 200) return res.status(503).json({ error: "Ollama not running", models: [] });
      const models = (result.body.models || []).map(m => m.name);
      res.json({ models });
    } catch (err) {
      console.error("Ollama /api/tags error:", err.message);
      res.status(503).json({ error: "Ollama not running", models: [] });
    }
  });

  // Proxy Ollama generate (non-streaming JSON response)
  app.post("/api/ollama/generate", async (req, res) => {
    const { model, prompt, system } = req.body;
    const body = JSON.stringify({ model, prompt, system, stream: false });
    try {
      const result = await httpRequest(
        {
          host: "127.0.0.1",
          port: 11434,
          path: "/api/generate",
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        },
        body
      );
      if (result.status !== 200) return res.status(result.status).json({ error: String(result.body) });
      return res.json(result.body);
    } catch (err) {
      console.error("Ollama proxy error:", err.message);
      res.status(503).json({ error: "Ollama not reachable" });
    }
  });

  // ========== SAVED TESTS API ==========

  // Get all saved tests (newest first, with attempt count and best score)
  app.get("/api/saved-tests", (req, res) => {
    db.all(
      `SELECT st.id, st.name, st.level, st.skills, st.ollama_model, st.created_at,
              COUNT(ts.id) as attempt_count,
              MAX(CAST(ts.score AS REAL) / NULLIF(ts.max_score, 0) * 100) as best_score
       FROM saved_tests st
       LEFT JOIN test_sessions ts ON ts.saved_test_id = st.id
       GROUP BY st.id
       ORDER BY st.created_at DESC`,
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
      }
    );
  });

  // Get a single saved test with full questions JSON
  app.get("/api/saved-tests/:id", (req, res) => {
    db.get("SELECT * FROM saved_tests WHERE id = ?", [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Test not found" });
      try {
        row.questions = JSON.parse(row.questions || "[]");
        row.skills = JSON.parse(row.skills || "[]");
      } catch (e) { }
      res.json(row);
    });
  });

  // Save a newly generated test
  app.post("/api/saved-tests", (req, res) => {
    const { name, level, skills, questions, ollama_model } = req.body;
    if (!name || !level || !questions) return res.status(400).json({ error: "Missing required fields" });
    db.run(
      "INSERT INTO saved_tests (name, level, skills, questions, ollama_model) VALUES (?, ?, ?, ?, ?)",
      [name, level, JSON.stringify(skills || []), JSON.stringify(questions), ollama_model || null],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true, id: this.lastID });
      }
    );
  });

  // Delete a saved test (and cascade delete its sessions)
  app.delete("/api/saved-tests/:id", (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM test_sessions WHERE saved_test_id = ?", [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.run("DELETE FROM saved_tests WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Test not found" });
        res.json({ ok: true });
      });
    });
  });

  // ========== TEST SESSIONS API ==========

  // Get all test sessions (newest first, joined with saved test name)
  app.get("/api/test-sessions", (req, res) => {
    db.all(
      `SELECT ts.*, st.name as test_name, st.level, st.skills
       FROM test_sessions ts
       JOIN saved_tests st ON ts.saved_test_id = st.id
       ORDER BY ts.created_at DESC
       LIMIT 50`,
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
      }
    );
  });

  // Get all sessions for a specific saved test
  app.get("/api/test-sessions/for/:savedTestId", (req, res) => {
    db.all(
      "SELECT * FROM test_sessions WHERE saved_test_id = ? ORDER BY created_at DESC",
      [req.params.savedTestId],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
      }
    );
  });

  // Save a completed test attempt
  app.post("/api/test-sessions", (req, res) => {
    const { saved_test_id, score, max_score, answers } = req.body;
    if (!saved_test_id) return res.status(400).json({ error: "saved_test_id required" });
    db.run(
      "INSERT INTO test_sessions (saved_test_id, score, max_score, answers) VALUES (?, ?, ?, ?)",
      [saved_test_id, score || 0, max_score || 0, JSON.stringify(answers || [])],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true, id: this.lastID });
      }
    );
  });

  const port = process.env.PORT || 3001;
  app.listen(port, () =>
    console.log(`FlashCards API listening on http://localhost:${port}`)
  );
}).catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
