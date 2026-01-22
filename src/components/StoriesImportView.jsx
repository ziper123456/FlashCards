import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Upload, Plus, Trash2, Edit3, AlertCircle, ArrowLeft, Save } from "lucide-react";

export default function StoriesImportView({ theme }) {
    const navigate = useNavigate();
    const [mode, setMode] = useState("quick"); // "quick" | "manual"
    const [storyName, setStoryName] = useState("");
    const [category, setCategory] = useState("General");
    const [inputText, setInputText] = useState("");
    const [editRows, setEditRows] = useState([]);
    const [newRow, setNewRow] = useState({ en_US: "", es_ES: "", vi_VN: "", de_DE: "" });
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const API_BASE = "http://localhost:3001";

    // Parse input text to rows
    const parseInputToRows = () => {
        if (!inputText.trim()) return [];
        const lines = inputText.trim().split("\n").filter((l) => l.trim());
        return lines.map((line) => {
            const parts = line.split("|").map((s) => s.trim());
            return {
                en_US: parts[0] || "",
                es_ES: parts[1] || "",
                vi_VN: parts[2] || "",
                de_DE: parts[3] || "",
            };
        });
    };

    const enableManualMode = () => {
        const parsed = parseInputToRows();
        setEditRows(parsed);
        setMode("manual");
        setInputText("");
    };

    const addRow = () => {
        if (!newRow.en_US.trim()) return;
        setEditRows([...editRows, { ...newRow }]);
        setNewRow({ en_US: "", es_ES: "", vi_VN: "", de_DE: "" });
    };

    const removeRow = (index) => {
        setEditRows(editRows.filter((_, i) => i !== index));
    };

    const updateRow = (index, field, value) => {
        const updated = [...editRows];
        updated[index] = { ...updated[index], [field]: value };
        setEditRows(updated);
    };

    const handleImport = async () => {
        if (!storyName.trim()) {
            setError("Please enter a story name");
            return;
        }

        let lines = mode === "quick" ? parseInputToRows() : editRows;

        if (lines.length === 0) {
            setError("Please add at least one line");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/api/stories`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: storyName.trim(),
                    category: category.trim() || "General",
                    lines,
                }),
            });

            const data = await res.json();
            if (data.ok) {
                navigate("/stories");
            } else {
                setError(data.error || "Failed to save story");
            }
        } catch (err) {
            setError("Failed to save story");
            console.error(err);
        }
        setSaving(false);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 h-full overflow-y-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate("/stories")}
                    className="btn-icon"
                >
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-heading-lg text-white">Import Story</h2>
            </div>

            {/* Story Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="form-label mb-2">
                        Story Name *
                    </label>
                    <input
                        type="text"
                        value={storyName}
                        onChange={(e) => setStoryName(e.target.value)}
                        placeholder="Enter story name..."
                        className={`input-field ${theme.bg} ${theme.border}`}
                    />
                </div>
                <div>
                    <label className="form-label mb-2">
                        Category
                    </label>
                    <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="General"
                        className={`input-field ${theme.bg} ${theme.border}`}
                    />
                </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-2 mb-4">
                <button
                    onClick={() => setMode("quick")}
                    className={`btn-toggle ${mode === "quick"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                        : "bg-white/5 text-slate-400 border border-transparent hover:bg-white/10"
                        }`}
                >
                    <FileText size={14} /> Quick
                </button>
                <button
                    onClick={enableManualMode}
                    className={`btn-toggle ${mode === "manual"
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                        : "bg-white/5 text-slate-400 border border-transparent hover:bg-white/10"
                        }`}
                >
                    <Edit3 size={14} /> Manual
                </button>
            </div>

            {/* Quick Mode */}
            {mode === "quick" && (
                <div className={`${theme.panel} ${theme.border} p-4 rounded-xl shadow-lg border`}>
                    <p className="text-xs text-slate-500 mb-3">
                        Format: <code className="text-emerald-400">EN|ES|VI|DE</code> per line
                    </p>
                    <textarea
                        className={`textarea-field h-64 ${theme.bg} ${theme.border}`}
                        placeholder={`Hello, how are you?|Hola, ¿cómo estás?|Xin chào, bạn khỏe không?|Hallo, wie geht es dir?
I am fine, thank you.|Estoy bien, gracias.|Tôi khỏe, cảm ơn.|Mir geht es gut, danke.`}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        disabled={!storyName.trim()}
                    />
                    {!storyName.trim() && (
                        <p className="text-xs text-amber-400 mt-2">Enter a story name first to enable input</p>
                    )}
                </div>
            )}

            {/* Manual Mode */}
            {mode === "manual" && (
                <div className={`${theme.panel} ${theme.border} rounded-xl shadow-lg overflow-hidden border`}>
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_40px] gap-2 p-3 bg-white/5 border-b border-white/10 text-label text-slate-500">
                        <div>🇺🇸 English</div>
                        <div>🇪🇸 Spanish</div>
                        <div>🇻🇳 Vietnamese</div>
                        <div>🇩🇪 German</div>
                        <div></div>
                    </div>

                    {/* Rows */}
                    <div className="max-h-[300px] overflow-y-auto">
                        {editRows.map((row, index) => (
                            <div
                                key={index}
                                className="grid grid-cols-[1fr_1fr_1fr_1fr_40px] gap-2 p-2 border-b border-white/5"
                            >
                                <input
                                    type="text"
                                    value={row.en_US}
                                    onChange={(e) => updateRow(index, "en_US", e.target.value)}
                                    className={`input-field input-field--sm ${theme.bg} ${theme.border}`}
                                />
                                <input
                                    type="text"
                                    value={row.es_ES}
                                    onChange={(e) => updateRow(index, "es_ES", e.target.value)}
                                    className={`input-field input-field--sm ${theme.bg} ${theme.border}`}
                                />
                                <input
                                    type="text"
                                    value={row.vi_VN}
                                    onChange={(e) => updateRow(index, "vi_VN", e.target.value)}
                                    className={`input-field input-field--sm ${theme.bg} ${theme.border}`}
                                />
                                <input
                                    type="text"
                                    value={row.de_DE}
                                    onChange={(e) => updateRow(index, "de_DE", e.target.value)}
                                    className={`input-field input-field--sm ${theme.bg} ${theme.border}`}
                                />
                                <button
                                    onClick={() => removeRow(index)}
                                    className="btn-icon text-red-400 hover:bg-red-500/10"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* New Row Input */}
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_40px] gap-2 p-2 bg-white/5 border-t border-white/10">
                        <input
                            type="text"
                            value={newRow.en_US}
                            onChange={(e) => setNewRow({ ...newRow, en_US: e.target.value })}
                            className={`input-field input-field--sm ${theme.bg} ${theme.border}`}
                            placeholder="English"
                        />
                        <input
                            type="text"
                            value={newRow.es_ES}
                            onChange={(e) => setNewRow({ ...newRow, es_ES: e.target.value })}
                            className={`input-field input-field--sm ${theme.bg} ${theme.border}`}
                            placeholder="Spanish"
                        />
                        <input
                            type="text"
                            value={newRow.vi_VN}
                            onChange={(e) => setNewRow({ ...newRow, vi_VN: e.target.value })}
                            className={`input-field input-field--sm ${theme.bg} ${theme.border}`}
                            placeholder="Vietnamese"
                        />
                        <input
                            type="text"
                            value={newRow.de_DE}
                            onChange={(e) => setNewRow({ ...newRow, de_DE: e.target.value })}
                            className={`input-field input-field--sm ${theme.bg} ${theme.border}`}
                            placeholder="German"
                        />
                        <button
                            onClick={addRow}
                            disabled={!newRow.en_US.trim()}
                            className="btn-icon text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-30"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    {editRows.length > 0 && (
                        <div className="p-2 text-label text-slate-500 border-t border-white/5">
                            {editRows.length} lines ready to import
                        </div>
                    )}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mt-4 flex items-center gap-2 text-xs text-red-400">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
                <button
                    onClick={() => navigate("/stories")}
                    className="btn-secondary"
                >
                    Cancel
                </button>
                <button
                    onClick={handleImport}
                    disabled={saving || !storyName.trim()}
                    className="btn-primary bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                    <Save size={16} />
                    {saving ? "Saving..." : "Import Story"}
                </button>
            </div>
        </div>
    );
}
