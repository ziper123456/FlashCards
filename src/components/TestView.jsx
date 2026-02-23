import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    GraduationCap, Play, Trash2, Clock, Trophy, AlertTriangle,
    ChevronRight, Loader2, RefreshCw, CheckCircle2
} from "lucide-react";
import { listModels } from "../services/ollamaService.js";
import { buildTest, saveTestToDb, DELE_LEVELS, SKILL_LABELS } from "../services/testEngine.js";

const API_BASE = "http://localhost:3001";

const QUESTION_COUNTS = [5, 10, 20];
const DEFAULT_MODEL = "llama3.1:8b";
const ALL_SKILLS = ["vocabulary", "listening", "reading", "writing"];

export default function TestView({ theme, masterDeck, settings }) {
    const navigate = useNavigate();

    // Config state
    const [selectedLevel, setSelectedLevel] = useState("B1");
    const [selectedSkills, setSelectedSkills] = useState(["vocabulary", "listening"]);
    const [questionCount, setQuestionCount] = useState(10);
    const [ollamaModel, setOllamaModel] = useState(DEFAULT_MODEL);

    // Ollama state
    const [availableModels, setAvailableModels] = useState([]);
    const [ollamaOnline, setOllamaOnline] = useState(null); // null=checking, true, false

    // Generation state
    const [generating, setGenerating] = useState(false);
    const [genProgress, setGenProgress] = useState({ message: "", percent: 0 });

    // History state
    const [savedTests, setSavedTests] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [historyTab, setHistoryTab] = useState("saved"); // "saved" | "attempts"
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Load available Ollama models
    useEffect(() => {
        listModels().then(models => {
            setAvailableModels(models);
            setOllamaOnline(models.length > 0);
            if (models.length > 0 && !models.includes(ollamaModel)) {
                setOllamaModel(models[0]);
            }
        });
    }, []);

    // Load test history
    const loadHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const [st, ts] = await Promise.all([
                fetch(`${API_BASE}/api/saved-tests`).then(r => r.json()),
                fetch(`${API_BASE}/api/test-sessions`).then(r => r.json()),
            ]);
            setSavedTests(Array.isArray(st) ? st : []);
            setSessions(Array.isArray(ts) ? ts : []);
        } catch (err) {
            console.error("Failed to load history:", err);
        }
        setLoadingHistory(false);
    }, []);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    const toggleSkill = (skill) => {
        setSelectedSkills(prev =>
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        );
    };

    const handleGenerate = async () => {
        if (selectedSkills.length === 0) return;
        if (!masterDeck || masterDeck.length === 0) {
            alert("No cards in your deck! Import some vocabulary cards first.");
            return;
        }

        setGenerating(true);
        setGenProgress({ message: "Starting generation…", percent: 0 });

        try {
            const questions = await buildTest(
                {
                    level: selectedLevel,
                    skills: selectedSkills,
                    count: questionCount,
                    cards: masterDeck,
                    model: ollamaModel,
                },
                (message, percent) => setGenProgress({ message, percent })
            );

            if (questions.length === 0) throw new Error("No questions generated");

            setGenProgress({ message: "Saving test…", percent: 95 });

            const now = new Date();
            const name = `${selectedLevel} Test — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
            const testId = await saveTestToDb(name, selectedLevel, selectedSkills, questions, ollamaModel);

            setGenProgress({ message: "Done!", percent: 100 });
            await loadHistory();

            // Navigate to the test session
            setTimeout(() => {
                navigate(`/test/session/${testId}`);
            }, 400);
        } catch (err) {
            console.error("Test generation failed:", err);
            alert(`Failed to generate test: ${err.message}`);
            setGenerating(false);
        }
    };

    const handleRetake = (testId) => {
        navigate(`/test/session/${testId}`);
    };

    const handleDelete = async (testId) => {
        try {
            await fetch(`${API_BASE}/api/saved-tests/${testId}`, { method: "DELETE" });
            setDeleteConfirm(null);
            await loadHistory();
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    const formatDate = (dt) => {
        return new Date(dt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const getLevelConfig = (lvl) => DELE_LEVELS[lvl] || DELE_LEVELS.B1;

    const scoreColor = (pct) => {
        if (pct >= 80) return "text-emerald-400";
        if (pct >= 60) return "text-amber-400";
        return "text-red-400";
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            {/* Page Header */}
            <div className={`flex items-center gap-3 p-6 border-b ${theme.border}`}>
                <div className="p-2 bg-violet-600 rounded-xl">
                    <GraduationCap size={22} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">DELE Test Mode</h1>
                    <p className="text-xs text-slate-400">AI-powered Spanish proficiency testing • A1–C2</p>
                </div>
                {ollamaOnline === false && (
                    <div className="ml-auto flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-lg px-3 py-1.5">
                        <AlertTriangle size={14} className="text-amber-400" />
                        <span className="text-xs text-amber-300 font-medium">Ollama offline — start with <code className="bg-black/30 px-1 rounded">ollama serve</code></span>
                    </div>
                )}
                {ollamaOnline === true && (
                    <div className="ml-auto flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-3 py-1.5">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span className="text-xs text-emerald-300 font-medium">Ollama online</span>
                    </div>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-6 p-6">
                {/* ─── Left: Test Config ─────────────────────────────────────── */}
                <div className="flex-1 min-w-0">
                    {/* Level Picker */}
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">1. Choose Level</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                        {Object.entries(DELE_LEVELS).map(([key, cfg]) => (
                            <button
                                key={key}
                                onClick={() => setSelectedLevel(key)}
                                className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 
                  ${selectedLevel === key
                                        ? `border-violet-500 bg-gradient-to-br ${cfg.color} shadow-lg shadow-violet-500/20`
                                        : `${theme.border} ${theme.panel} hover:border-white/30`
                                    }`}
                            >
                                <div className="text-xl font-black text-white mb-1">{key}</div>
                                <div className="text-[10px] font-semibold text-white/70 uppercase tracking-widest leading-tight">
                                    {cfg.description}
                                </div>
                                {selectedLevel === key && (
                                    <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full shadow-lg" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Skills */}
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">2. Select Skills</h2>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {ALL_SKILLS.map(skill => {
                            const cfg = SKILL_LABELS[skill];
                            const active = selectedSkills.includes(skill);
                            const needsOllama = skill === "reading" || skill === "writing";
                            return (
                                <button
                                    key={skill}
                                    onClick={() => toggleSkill(skill)}
                                    className={`p-4 rounded-2xl border-2 text-left transition-all duration-200
                    ${active
                                            ? "border-violet-500 bg-violet-500/15 shadow-md shadow-violet-500/10"
                                            : `${theme.border} ${theme.panel} hover:border-white/30`
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xl">{cfg.icon}</span>
                                        {needsOllama && (
                                            <span className="text-[9px] text-violet-400 font-semibold uppercase tracking-wide bg-violet-500/20 px-1.5 py-0.5 rounded">
                                                AI
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-semibold text-white text-sm">{cfg.label}</div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">{cfg.desc}</div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Config Row */}
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">3. Configure</h2>
                    <div className="flex flex-wrap gap-4 mb-6">
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Questions</label>
                            <div className="flex gap-2">
                                {QUESTION_COUNTS.map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setQuestionCount(n)}
                                        className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all
                      ${questionCount === n
                                                ? "bg-violet-600 border-violet-500 text-white"
                                                : `${theme.border} ${theme.panel} text-slate-400 hover:text-white`
                                            }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Model</label>
                            <select
                                value={ollamaModel}
                                onChange={e => setOllamaModel(e.target.value)}
                                className={`${theme.bg} ${theme.border} border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500`}
                            >
                                {availableModels.length > 0
                                    ? availableModels.map(m => <option key={m} value={m}>{m}</option>)
                                    : <option value={DEFAULT_MODEL}>{DEFAULT_MODEL}</option>
                                }
                            </select>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating || selectedSkills.length === 0 || ollamaOnline === false}
                        className={`w-full py-4 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-3 transition-all shadow-xl
              ${generating || selectedSkills.length === 0 || ollamaOnline === false
                                ? "bg-slate-700 cursor-not-allowed opacity-60"
                                : "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-violet-500/30 active:scale-[0.98]"
                            }`}
                    >
                        {generating ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span className="flex flex-col items-start leading-tight">
                                    <span className="text-sm font-normal opacity-70">{genProgress.message}</span>
                                    <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden mt-1">
                                        <div
                                            className="h-full bg-white rounded-full transition-all duration-300"
                                            style={{ width: `${genProgress.percent}%` }}
                                        />
                                    </div>
                                </span>
                            </>
                        ) : (
                            <>
                                <GraduationCap size={20} />
                                Generate & Start Test
                            </>
                        )}
                    </button>
                    {selectedSkills.length === 0 && (
                        <p className="text-xs text-amber-400 mt-2 text-center">Select at least one skill</p>
                    )}
                </div>

                {/* ─── Right: History ─────────────────────────────────────────── */}
                <div className="w-full lg:w-[360px] shrink-0">
                    {/* Tabs */}
                    <div className="flex gap-1 mb-4">
                        {["saved", "attempts"].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setHistoryTab(tab)}
                                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all
                  ${historyTab === tab
                                        ? "bg-violet-600 text-white"
                                        : `${theme.panel} ${theme.border} border text-slate-400 hover:text-white`
                                    }`}
                            >
                                {tab === "saved" ? "📚 Saved Tests" : "🏆 Past Attempts"}
                            </button>
                        ))}
                        <button
                            onClick={loadHistory}
                            className={`p-2 rounded-xl ${theme.panel} ${theme.border} border text-slate-500 hover:text-white transition-colors`}
                            title="Refresh"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>

                    {loadingHistory ? (
                        <div className="flex items-center justify-center h-32 text-slate-500">
                            <Loader2 size={20} className="animate-spin" />
                        </div>
                    ) : historyTab === "saved" ? (
                        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                            {savedTests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-32 text-slate-600 text-sm">
                                    <GraduationCap size={32} className="mb-2 opacity-40" />
                                    No saved tests yet — generate your first one!
                                </div>
                            ) : savedTests.map(test => {
                                const lvlCfg = getLevelConfig(test.level);
                                return (
                                    <div key={test.id} className={`${theme.panel} ${theme.border} border rounded-2xl p-4`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${lvlCfg.badge}`}>
                                                        {test.level}
                                                    </span>
                                                    {test.attempt_count > 0 && (
                                                        <span className="text-xs text-slate-500">{test.attempt_count} attempt{test.attempt_count !== 1 ? "s" : ""}</span>
                                                    )}
                                                    {test.best_score != null && (
                                                        <span className={`text-xs font-bold ml-auto ${scoreColor(test.best_score)}`}>
                                                            Best: {Math.round(test.best_score)}%
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-semibold text-white truncate">{test.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Clock size={11} className="text-slate-500" />
                                                    <span className="text-[11px] text-slate-500">{formatDate(test.created_at)}</span>
                                                    <span className="text-[11px] text-slate-600">•</span>
                                                    <span className="text-[11px] text-violet-400">{JSON.parse(test.skills || "[]").join(", ")}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-3">
                                            <button
                                                onClick={() => handleRetake(test.id)}
                                                className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1 transition-colors"
                                            >
                                                <Play size={13} />
                                                {test.attempt_count > 0 ? "Retake" : "Start"}
                                            </button>
                                            {deleteConfirm === test.id ? (
                                                <>
                                                    <button
                                                        onClick={() => handleDelete(test.id)}
                                                        className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors"
                                                    >
                                                        Confirm
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(null)}
                                                        className="px-3 py-2 text-slate-500 hover:text-white text-xs transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setDeleteConfirm(test.id)}
                                                    className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                                                    title="Delete test"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                            {sessions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-32 text-slate-600 text-sm">
                                    <Trophy size={32} className="mb-2 opacity-40" />
                                    No attempts yet
                                </div>
                            ) : sessions.map(s => {
                                const pct = s.max_score > 0 ? Math.round((s.score / s.max_score) * 100) : 0;
                                const lvlCfg = getLevelConfig(s.level);
                                return (
                                    <div key={s.id} className={`${theme.panel} ${theme.border} border rounded-xl p-3 flex items-center gap-3`}>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${lvlCfg.badge} shrink-0`}>
                                            {s.level}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white font-medium truncate">{s.test_name}</p>
                                            <p className="text-[11px] text-slate-500">{formatDate(s.created_at)}</p>
                                        </div>
                                        <span className={`text-lg font-black ${scoreColor(pct)}`}>{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
