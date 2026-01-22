import React, { useState, useEffect } from "react";
import { FileText, Upload, AlertCircle, Plus, Trash2, Edit3, List, Search, Languages, Save, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export default function ImportView({
  theme,
  fileInputRef,
  handleFileUploads,
  inputText,
  setInputText,
  handleImport,
  importError,
  setView,
  masterDeck,
  processNewCards,
  setImportError,
  refreshMasterDeck,
}) {
  // Mode: "quick" | "manual" | "missing"
  const [mode, setMode] = useState("quick");
  const [editRows, setEditRows] = useState([]);
  const [newRow, setNewRow] = useState({ category: "General", en_US: "", es_ES: "", vi_VN: "", de_DE: "" });

  // Missing words state
  const [missingWords, setMissingWords] = useState([]);
  const [missingTotal, setMissingTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modifiedIds, setModifiedIds] = useState(new Set());

  // Load missing words when mode changes or pagination changes
  useEffect(() => {
    if (mode === "missing") {
      loadMissingWords();
    }
  }, [mode, page, limit]);

  const loadMissingWords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/missing-words?page=${page}&limit=${limit}`);
      const data = await res.json();
      setMissingWords(data.cards || []);
      setMissingTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setModifiedIds(new Set());
    } catch (err) {
      console.error("Failed to load missing words:", err);
    }
    setLoading(false);
  };

  // Update a missing word row
  const updateMissingRow = (id, field, value) => {
    setMissingWords(prev =>
      prev.map(row => row.id === id ? { ...row, [field]: value } : row)
    );
    setModifiedIds(prev => new Set([...prev, id]));
  };

  // Translate missing fields for current page
  const translateMissing = async () => {
    setTranslating(true);
    try {
      // Find cards with missing translations
      const toTranslate = missingWords.filter(card =>
        !card.vi_VN || !card.de_DE
      );

      if (toTranslate.length === 0) {
        setTranslating(false);
        return;
      }

      // Translate to Vietnamese
      const viMissing = toTranslate.filter(c => !c.vi_VN);
      if (viMissing.length > 0) {
        const viRes = await fetch("http://localhost:3001/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            texts: viMissing.map(c => c.en_US),
            sourceLang: "en",
            targetLang: "vi"
          })
        });
        const viData = await viRes.json();
        if (viData.translations) {
          setMissingWords(prev => {
            const updated = [...prev];
            viMissing.forEach((card, i) => {
              const idx = updated.findIndex(c => c.id === card.id);
              if (idx !== -1 && viData.translations[i]) {
                updated[idx] = { ...updated[idx], vi_VN: viData.translations[i] };
                setModifiedIds(p => new Set([...p, card.id]));
              }
            });
            return updated;
          });
        }
      }

      // Translate to German
      const deMissing = toTranslate.filter(c => !c.de_DE);
      if (deMissing.length > 0) {
        const deRes = await fetch("http://localhost:3001/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            texts: deMissing.map(c => c.en_US),
            sourceLang: "en",
            targetLang: "de"
          })
        });
        const deData = await deRes.json();
        if (deData.translations) {
          setMissingWords(prev => {
            const updated = [...prev];
            deMissing.forEach((card, i) => {
              const idx = updated.findIndex(c => c.id === card.id);
              if (idx !== -1 && deData.translations[i]) {
                updated[idx] = { ...updated[idx], de_DE: deData.translations[i] };
                setModifiedIds(p => new Set([...p, card.id]));
              }
            });
            return updated;
          });
        }
      }
    } catch (err) {
      console.error("Translation error:", err);
    }
    setTranslating(false);
  };

  // Save modified cards
  const saveChanges = async () => {
    const modified = missingWords.filter(c => modifiedIds.has(c.id));
    if (modified.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch("http://localhost:3001/api/cards/batch-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: modified })
      });
      const data = await res.json();
      if (data.ok) {
        setModifiedIds(new Set());
        // Reload to refresh the list
        loadMissingWords();
        // Also refresh the master deck so words appear in deck selection
        if (refreshMasterDeck) {
          await refreshMasterDeck();
        }
      }
    } catch (err) {
      console.error("Save error:", err);
    }
    setSaving(false);
  };

  // Parse input text to rows when switching to manual mode
  const parseInputToRows = () => {
    if (!inputText.trim()) return [];
    const rows = [];

    try {
      const trimmed = inputText.trim();
      if (trimmed.startsWith("[")) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            rows.push({
              category: (Array.isArray(item.categories) ? item.categories[0] : item.category) || "General",
              en_US: item["en-US"] || item.en_US || item.front || "",
              es_ES: item["es-ES"] || item.es_ES || item.back || "",
              vi_VN: item["vi-VN"] || item.vi_VN || "",
              de_DE: item["de-DE"] || item.de_DE || "",
              isNew: true,
            });
          });
        }
      } else {
        const lines = trimmed.split("\n").filter((l) => l.trim());
        lines.forEach((line) => {
          let category = "General";
          let rest = line;
          if (line.includes(">")) {
            const parts = line.split(">");
            category = parts[0].trim();
            rest = parts.slice(1).join(">").trim();
          }
          const langs = rest.split("|").map((s) => s.trim());
          if (langs[0]) {
            rows.push({
              category,
              en_US: langs[0] || "",
              es_ES: langs[1] || "",
              vi_VN: langs[2] || "",
              de_DE: langs[3] || "",
              isNew: true,
            });
          }
        });
      }
    } catch (err) { }

    return rows;
  };

  const checkAndPopulateExisting = (rows) => {
    return rows.map((row) => {
      if (!row.en_US) return row;
      const existing = masterDeck?.find(
        (c) => c.en_US && c.en_US.toLowerCase().trim() === row.en_US.toLowerCase().trim()
      );
      if (existing) {
        return {
          ...row,
          id: existing.id,
          category: row.category || (existing.categories?.[0] || "General"),
          es_ES: row.es_ES || existing.es_ES || "",
          vi_VN: row.vi_VN || existing.vi_VN || "",
          de_DE: row.de_DE || existing.de_DE || "",
          isExisting: true,
          isNew: false,
        };
      }
      return row;
    });
  };

  const enableManualMode = () => {
    const parsed = parseInputToRows();
    const populated = checkAndPopulateExisting(parsed);
    setEditRows(populated);
    setMode("manual");
    setInputText("");
  };

  const addRow = () => {
    if (!newRow.en_US.trim()) return;
    const populated = checkAndPopulateExisting([newRow]);
    setEditRows([...editRows, { ...populated[0], isNew: !populated[0].isExisting }]);
    setNewRow({ category: "General", en_US: "", es_ES: "", vi_VN: "", de_DE: "" });
  };

  const removeRow = (index) => {
    setEditRows(editRows.filter((_, i) => i !== index));
  };

  const updateRow = (index, field, value) => {
    const updated = [...editRows];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "en_US") {
      const populated = checkAndPopulateExisting([updated[index]]);
      updated[index] = populated[0];
    }
    setEditRows(updated);
  };

  const importAllRows = () => {
    if (editRows.length === 0) return;
    const cards = editRows.map((row) => ({
      en_US: row.en_US,
      es_ES: row.es_ES,
      vi_VN: row.vi_VN,
      de_DE: row.de_DE,
      category: row.category,
    }));
    processNewCards(cards);
    setEditRows([]);
    setMode("quick");
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 h-full overflow-y-auto pb-20">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-2xl font-semibold text-white">Import Words</h2>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode("quick")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${mode === "quick"
              ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50"
              : "bg-white/5 text-slate-400 border border-transparent hover:bg-white/10"
              }`}
          >
            <FileText size={14} /> Quick
          </button>
          <button
            onClick={enableManualMode}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${mode === "manual"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
              : "bg-white/5 text-slate-400 border border-transparent hover:bg-white/10"
              }`}
          >
            <Edit3 size={14} /> Manual
          </button>
          <button
            onClick={() => setMode("missing")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${mode === "missing"
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
              : "bg-white/5 text-slate-400 border border-transparent hover:bg-white/10"
              }`}
          >
            <Search size={14} /> Missing ({missingTotal || "?"})
          </button>
        </div>
      </div>

      {mode === "quick" && (
        /* Quick Import Mode */
        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className={`${theme.panel} border ${theme.border} p-4 rounded-xl shadow-lg`}>
            <div className={`flex items-center gap-2 ${theme.textAccent} font-bold text-sm mb-2`}>
              <FileText size={18} /> Import Files (.csv, .txt)
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              multiple
              onChange={handleFileUploads}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`${theme.accent} ${theme.onAccent} w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all`}
            >
              <Upload size={16} /> Choose Files
            </button>
          </div>

          <div className={`${theme.panel} border ${theme.border} p-4 rounded-xl shadow-lg`}>
            <div className={`flex items-center gap-2 ${theme.textAccent} font-bold text-sm mb-2`}>
              <List size={18} /> Text/JSON Import
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Format: <code className="text-indigo-400">Category &gt; EN|ES|VI|DE</code> or JSON array
            </p>
            <textarea
              className={`w-full h-40 ${theme.bg} border ${theme.border} rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-white/20 outline-none transition-all text-white`}
              placeholder={`Fruits > Apple|Manzana|Táo|Apfel\nNumbers > One|Uno|Một|Eins`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>
        </div>
      )}

      {mode === "manual" && (
        /* Manual Mode - 5 Column Editor */
        <div className={`${theme.panel} border ${theme.border} rounded-xl shadow-lg overflow-hidden`}>
          <div className="grid grid-cols-[100px_1fr_1fr_1fr_1fr_40px] gap-2 p-3 bg-white/5 border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <div>Category</div>
            <div>🇺🇸 English</div>
            <div>🇪🇸 Spanish</div>
            <div>🇻🇳 Vietnamese</div>
            <div>🇩🇪 German</div>
            <div></div>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {editRows.map((row, index) => (
              <div
                key={index}
                className={`grid grid-cols-[100px_1fr_1fr_1fr_1fr_40px] gap-2 p-2 border-b border-white/5 ${row.isExisting ? "bg-amber-500/10" : row.isNew ? "bg-emerald-500/5" : ""
                  }`}
              >
                <input
                  type="text"
                  value={row.category}
                  onChange={(e) => updateRow(index, "category", e.target.value)}
                  className={`px-2 py-1 rounded text-xs ${theme.bg} border ${theme.border} text-white`}
                />
                <input
                  type="text"
                  value={row.en_US}
                  onChange={(e) => updateRow(index, "en_US", e.target.value)}
                  className={`px-2 py-1 rounded text-xs ${theme.bg} border ${row.isExisting ? "border-amber-500/50" : theme.border
                    } text-white font-medium`}
                  placeholder="Required"
                />
                <input
                  type="text"
                  value={row.es_ES}
                  onChange={(e) => updateRow(index, "es_ES", e.target.value)}
                  className={`px-2 py-1 rounded text-xs ${theme.bg} border ${theme.border} text-white`}
                />
                <input
                  type="text"
                  value={row.vi_VN}
                  onChange={(e) => updateRow(index, "vi_VN", e.target.value)}
                  className={`px-2 py-1 rounded text-xs ${theme.bg} border ${theme.border} text-white`}
                />
                <input
                  type="text"
                  value={row.de_DE}
                  onChange={(e) => updateRow(index, "de_DE", e.target.value)}
                  className={`px-2 py-1 rounded text-xs ${theme.bg} border ${theme.border} text-white`}
                />
                <button
                  onClick={() => removeRow(index)}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[100px_1fr_1fr_1fr_1fr_40px] gap-2 p-2 bg-white/5 border-t border-white/10">
            <input
              type="text"
              value={newRow.category}
              onChange={(e) => setNewRow({ ...newRow, category: e.target.value })}
              className={`px-2 py-1 rounded text-xs ${theme.bg} border ${theme.border} text-white`}
              placeholder="Category"
            />
            <input
              type="text"
              value={newRow.en_US}
              onChange={(e) => setNewRow({ ...newRow, en_US: e.target.value })}
              className={`px-2 py-1 rounded text-xs ${theme.bg} border ${theme.border} text-white`}
              placeholder="English (required)"
            />
            <input
              type="text"
              value={newRow.es_ES}
              onChange={(e) => setNewRow({ ...newRow, es_ES: e.target.value })}
              className={`px-2 py-1 rounded text-xs ${theme.bg} border ${theme.border} text-white`}
              placeholder="Spanish"
            />
            <input
              type="text"
              value={newRow.vi_VN}
              onChange={(e) => setNewRow({ ...newRow, vi_VN: e.target.value })}
              className={`px-2 py-1 rounded text-xs ${theme.bg} border ${theme.border} text-white`}
              placeholder="Vietnamese"
            />
            <input
              type="text"
              value={newRow.de_DE}
              onChange={(e) => setNewRow({ ...newRow, de_DE: e.target.value })}
              className={`px-2 py-1 rounded text-xs ${theme.bg} border ${theme.border} text-white`}
              placeholder="German"
            />
            <button
              onClick={addRow}
              disabled={!newRow.en_US.trim()}
              className={`p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded disabled:opacity-30`}
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex items-center gap-4 p-2 text-[10px] text-slate-500 border-t border-white/5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-emerald-500/30"></span> New
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-amber-500/30"></span> Existing (will update)
            </span>
          </div>
        </div>
      )}

      {mode === "missing" && (
        /* Missing Words Mode */
        <div className={`${theme.panel} border ${theme.border} rounded-xl shadow-lg overflow-hidden`}>
          {/* Toolbar */}
          <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/10 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                Showing {missingWords.length} of {missingTotal} incomplete cards
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
                className={`px-2 py-1 rounded text-xs ${theme.bg} border ${theme.border} text-white`}
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
              <button
                onClick={translateMissing}
                disabled={translating || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30 disabled:opacity-50"
              >
                {translating ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                {translating ? "Translating..." : "Translate Page"}
              </button>
              <button
                onClick={saveChanges}
                disabled={saving || modifiedIds.size === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 disabled:opacity-50"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? "Saving..." : `Save (${modifiedIds.size})`}
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="grid grid-cols-[50px_1fr_1fr_1fr_1fr] gap-2 p-3 bg-white/5 border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <div>ID</div>
            <div>🇺🇸 English</div>
            <div>🇪🇸 Spanish</div>
            <div>🇻🇳 Vietnamese</div>
            <div>🇩🇪 German</div>
          </div>

          {/* Rows */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8 text-slate-400">
                <Loader2 size={24} className="animate-spin mr-2" /> Loading...
              </div>
            ) : missingWords.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-slate-400">
                No incomplete cards found!
              </div>
            ) : (
              missingWords.map((row) => (
                <div
                  key={row.id}
                  className={`grid grid-cols-[50px_1fr_1fr_1fr_1fr] gap-2 p-2 border-b border-white/5 ${modifiedIds.has(row.id) ? "bg-emerald-500/10" : ""
                    }`}
                >
                  <div className="text-xs text-slate-500 flex items-center">{row.id}</div>
                  <input
                    type="text"
                    value={row.en_US}
                    onChange={(e) => updateMissingRow(row.id, "en_US", e.target.value)}
                    className={`px-2 py-1 rounded text-xs ${theme.bg} border ${!row.en_US ? "border-red-500/50" : theme.border
                      } text-white`}
                  />
                  <input
                    type="text"
                    value={row.es_ES}
                    onChange={(e) => updateMissingRow(row.id, "es_ES", e.target.value)}
                    className={`px-2 py-1 rounded text-xs ${theme.bg} border ${!row.es_ES ? "border-red-500/50" : theme.border
                      } text-white`}
                  />
                  <input
                    type="text"
                    value={row.vi_VN}
                    onChange={(e) => updateMissingRow(row.id, "vi_VN", e.target.value)}
                    className={`px-2 py-1 rounded text-xs ${theme.bg} border ${!row.vi_VN ? "border-amber-500/50" : theme.border
                      } text-white`}
                    placeholder="Missing"
                  />
                  <input
                    type="text"
                    value={row.de_DE}
                    onChange={(e) => updateMissingRow(row.id, "de_DE", e.target.value)}
                    className={`px-2 py-1 rounded text-xs ${theme.bg} border ${!row.de_DE ? "border-amber-500/50" : theme.border
                      } text-white`}
                    placeholder="Missing"
                  />
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-3 bg-white/5 border-t border-white/10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-slate-400 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span className="text-xs text-slate-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-slate-400 hover:bg-white/10 disabled:opacity-30"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {importError && (
        <div className={`mt-3 flex items-center gap-2 text-xs ${theme.textAccent} animate-pulse`}>
          <AlertCircle size={14} /> {importError}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => {
            setMode("quick");
            setEditRows([]);
            setView("menu");
          }}
          className="px-4 py-2 text-slate-400 hover:text-white"
        >
          Cancel
        </button>

        {mode === "manual" && (
          <button
            onClick={importAllRows}
            disabled={editRows.length === 0}
            className={`${theme.accent} ${theme.onAccent} disabled:bg-slate-800 disabled:text-slate-500 px-6 py-2 rounded-lg font-semibold`}
          >
            Import All ({editRows.length})
          </button>
        )}

        {mode === "quick" && (
          <button
            onClick={handleImport}
            disabled={!inputText.trim()}
            className={`${theme.accent} ${theme.onAccent} disabled:bg-slate-800 disabled:text-slate-500 px-6 py-2 rounded-lg font-semibold`}
          >
            Add to Deck
          </button>
        )}
      </div>
    </div>
  );
}
