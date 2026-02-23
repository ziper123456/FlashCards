import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Trophy, RotateCcw, Home, GraduationCap, Check, X, Lightbulb } from "lucide-react";
import { DELE_LEVELS, SKILL_LABELS } from "../services/testEngine.js";

const SKILL_COLORS = {
    vocabulary: { bar: "bg-violet-500", text: "text-violet-400" },
    listening: { bar: "bg-sky-500", text: "text-sky-400" },
    reading: { bar: "bg-emerald-500", text: "text-emerald-400" },
    writing: { bar: "bg-amber-500", text: "text-amber-400" },
};

export default function TestResultView({ theme }) {
    const navigate = useNavigate();
    const { state } = useLocation();

    const { answers = [], test, testId } = state || {};

    // Compute overall score
    const totalScore = answers.reduce((s, a) => s + (a.score || 0), 0);
    const totalMax = answers.reduce((s, a) => s + (a.maxScore || 10), 0);
    const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
    const passed = pct >= 60;

    // Per-skill breakdown
    const skillBreakdown = useMemo(() => {
        const skills = {};
        answers.forEach(a => {
            if (!skills[a.skill]) skills[a.skill] = { score: 0, max: 0, count: 0 };
            skills[a.skill].score += a.score || 0;
            skills[a.skill].max += a.maxScore || 10;
            skills[a.skill].count += 1;
        });
        return skills;
    }, [answers]);

    const scoreColor = (p) => {
        if (p >= 80) return "text-emerald-400";
        if (p >= 60) return "text-amber-400";
        return "text-red-400";
    };

    const lvlCfg = DELE_LEVELS[test?.level] || DELE_LEVELS.B1;

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            {/* ── Hero result area ──────────────────────────────────────────────── */}
            <div className={`flex flex-col items-center py-10 px-6 border-b ${theme.border} ${theme.panel}`}>
                <Trophy
                    size={56}
                    className={passed ? "text-amber-400 drop-shadow-lg" : "text-slate-600"}
                />
                <h1 className="text-3xl font-black text-white mt-4">
                    {pct}%
                </h1>
                <p className={`text-sm font-semibold mt-1 ${passed ? "text-emerald-400" : "text-red-400"}`}>
                    {passed ? "✓ Passed" : "✗ Not passed"} · DELE {test?.level}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                    {totalScore} / {totalMax} points · {answers.length} questions
                </p>

                {/* Per-skill bars */}
                <div className="w-full max-w-lg mt-8 space-y-3">
                    {Object.entries(skillBreakdown).map(([skill, data]) => {
                        const skillPct = data.max > 0 ? Math.round((data.score / data.max) * 100) : 0;
                        const cfg = SKILL_COLORS[skill] || { bar: "bg-violet-500", text: "text-violet-400" };
                        const label = SKILL_LABELS[skill]?.label || skill;
                        return (
                            <div key={skill}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-slate-400 font-medium">
                                        {SKILL_LABELS[skill]?.icon} {label}
                                    </span>
                                    <span className={`text-xs font-bold ${scoreColor(skillPct)}`}>
                                        {skillPct}% ({data.score}/{data.max})
                                    </span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${cfg.bar} rounded-full transition-all duration-700`}
                                        style={{ width: `${skillPct}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CTAs */}
                <div className="flex gap-3 mt-8">
                    <button
                        onClick={() => navigate(`/test/session/${testId}`)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-all"
                    >
                        <RotateCcw size={15} />
                        Retry Test
                    </button>
                    <button
                        onClick={() => navigate("/test")}
                        className={`flex items-center gap-2 px-5 py-2.5 ${theme.panel} border ${theme.border} text-slate-300 hover:text-white rounded-xl font-semibold text-sm transition-all`}
                    >
                        <GraduationCap size={15} />
                        New Test
                    </button>
                    <button
                        onClick={() => navigate("/vocabulary")}
                        className={`flex items-center gap-2 px-4 py-2.5 ${theme.panel} border ${theme.border} text-slate-500 hover:text-white rounded-xl text-sm transition-all`}
                    >
                        <Home size={15} />
                    </button>
                </div>
            </div>

            {/* ── Per-question review ───────────────────────────────────────────── */}
            <div className="p-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    Question Review
                </h2>
                <div className="space-y-4 max-w-2xl mx-auto">
                    {answers.map((a, i) => {
                        const skillCfg = SKILL_COLORS[a.skill] || {};
                        const isWritingOrReading = a.skill === "writing" || a.skill === "reading";
                        return (
                            <div
                                key={i}
                                className={`${theme.panel} border rounded-2xl overflow-hidden ${a.isCorrect ? "border-white/10" : "border-red-500/20"}`}
                            >
                                <div className={`flex items-center gap-3 px-4 py-3 border-b ${theme.border}`}>
                                    <div className={`p-1.5 rounded-full ${a.isCorrect ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                                        {a.isCorrect
                                            ? <Check size={14} className="text-emerald-400" />
                                            : <X size={14} className="text-red-400" />
                                        }
                                    </div>
                                    <span className={`text-xs font-semibold ${skillCfg.text || "text-violet-400"}`}>
                                        {SKILL_LABELS[a.skill]?.icon} {SKILL_LABELS[a.skill]?.label}
                                    </span>
                                    <span className="ml-auto text-xs font-bold text-slate-300">
                                        {a.score}/{a.maxScore}
                                    </span>
                                </div>

                                <div className="px-4 py-3 space-y-2">
                                    {/* Question */}
                                    {!isWritingOrReading && (
                                        <p className="text-xs text-slate-500">
                                            <span className="font-medium text-slate-400">Q: </span>
                                            {a.question?.length > 100 ? a.question.slice(0, 100) + "…" : a.question}
                                        </p>
                                    )}

                                    {/* User's answer */}
                                    <p className={`text-sm ${a.isCorrect ? "text-white" : "text-red-300 line-through opacity-70"}`}>
                                        <span className="text-xs text-slate-500 not-italic">Your answer: </span>
                                        {a.userAnswer}
                                    </p>

                                    {/* Accent reminder */}
                                    {a.accentReminder && (
                                        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
                                            <Lightbulb size={12} className="text-amber-400 shrink-0" />
                                            <p className="text-xs text-amber-300">
                                                Remember the accent: <span className="font-bold">{a.accentReminder}</span>
                                            </p>
                                        </div>
                                    )}

                                    {/* Correct answer / correction */}
                                    {!a.isCorrect && (
                                        <p className="text-sm text-emerald-300">
                                            <span className="text-xs text-slate-500">Correct: </span>
                                            {a.correction || a.correctAnswer}
                                        </p>
                                    )}

                                    {/* AI explanation */}
                                    {a.explanation && a.explanation !== "Correct!" && (
                                        <p className="text-xs text-slate-500 italic border-t border-white/5 pt-2 mt-1">
                                            {a.explanation}
                                        </p>
                                    )}

                                    {/* Writing correction */}
                                    {isWritingOrReading && a.correction && a.correction !== a.userAnswer && (
                                        <div className={`${theme.bg} border ${theme.border} rounded-xl p-3 mt-2`}>
                                            <p className="text-xs text-slate-500 mb-1">
                                                {a.skill === "writing" ? "Improved version" : "Ideal answer"}
                                            </p>
                                            <p className="text-sm text-white/80 italic">{a.correction}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
