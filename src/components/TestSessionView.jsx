import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft, Volume2, Loader2, Check, X, ChevronRight,
    AlertCircle, Lightbulb, GraduationCap
} from "lucide-react";
import { evaluate, normaliseBasic, normaliseNoAccents } from "../services/ollamaService.js";
import { DELE_LEVELS, SKILL_LABELS } from "../services/testEngine.js";
import { saveSession } from "../services/testEngine.js";

const API_BASE = "http://localhost:3001";

const SKILL_COLORS = {
    vocabulary: "bg-violet-600",
    listening: "bg-sky-600",
    reading: "bg-emerald-600",
    writing: "bg-amber-600",
};

const MAX_SCORE = { vocabulary: 10, listening: 10, reading: 15, writing: 20 };

export default function TestSessionView({ theme, settings, testId }) {
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const textareaRef = useRef(null);

    // Test data
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    // Session state
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answer, setAnswer] = useState("");
    const [answers, setAnswers] = useState([]); // accumulated results

    // Per-question state
    const [grading, setGrading] = useState(false);
    const [result, setResult] = useState(null); // { score, maxScore, isCorrect, accentReminder, correction, explanation }
    const [hasListened, setHasListened] = useState(false);
    const [ttsPlaying, setTtsPlaying] = useState(false);

    // Load test from backend
    useEffect(() => {
        if (!testId) return;
        fetch(`${API_BASE}/api/saved-tests/${testId}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setTest(data);
            })
            .catch(err => setLoadError(err.message))
            .finally(() => setLoading(false));
    }, [testId]);

    // Auto-focus input when question changes
    useEffect(() => {
        if (!result) {
            setTimeout(() => {
                inputRef.current?.focus();
                textareaRef.current?.focus();
            }, 100);
        }
    }, [currentIdx, result]);

    const currentQuestion = test?.questions?.[currentIdx];
    const totalQ = test?.questions?.length || 0;
    const progress = totalQ > 0 ? ((currentIdx) / totalQ) * 100 : 0;

    // ─── TTS for listening questions ──────────────────────────────────────────
    const speakText = useCallback((text, lang = "es-ES") => {
        if (!window.speechSynthesis || !text) return;
        window.speechSynthesis.cancel();
        const voices = window.speechSynthesis.getVoices();

        // Try to use the saved Spanish voice from settings
        const savedVoiceURI = settings?.ttsVoice_es_ES || "";
        const voice = voices.find(v => v.voiceURI === savedVoiceURI)
            || voices.find(v => v.lang.startsWith("es"));

        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = lang;
        utt.rate = settings?.ttsRate || 0.9; // slightly slower for listening tasks
        utt.pitch = settings?.ttsPitch || 1.0;
        utt.volume = settings?.ttsVolume || 1.0;
        if (voice) utt.voice = voice;

        utt.onstart = () => setTtsPlaying(true);
        utt.onend = () => { setTtsPlaying(false); setHasListened(true); };
        utt.onerror = () => setTtsPlaying(false);

        window.speechSynthesis.speak(utt);
    }, [settings]);

    // Auto-play TTS when a listening question loads
    useEffect(() => {
        if (currentQuestion?.skill === "listening" && !result) {
            setHasListened(false);
            setTimeout(() => speakText(currentQuestion.prompt), 600);
        }
        return () => window.speechSynthesis?.cancel();
    }, [currentIdx, currentQuestion?.skill]);

    // ─── Answer grading ───────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!answer.trim() || grading || result) return;

        const q = currentQuestion;
        if (!q) return;

        // Vocabulary & Listening: ALWAYS use local string matching. Never call Ollama.
        // Ollama is too inconsistent for single-word vocabulary grading.
        if (q.skill === "vocabulary" || q.skill === "listening") {
            const exactMatch = normaliseBasic(answer) === normaliseBasic(q.correctAnswer);
            const accentStrippedMatch = normaliseNoAccents(answer) === normaliseNoAccents(q.correctAnswer);
            const isCorrect = exactMatch || accentStrippedMatch;
            const accentReminder = !exactMatch && accentStrippedMatch ? q.correctAnswer : null;

            setResult({
                score: isCorrect ? MAX_SCORE[q.skill] : 0,
                maxScore: MAX_SCORE[q.skill],
                isCorrect,
                accentReminder,
                correction: q.correctAnswer,
                explanation: exactMatch
                    ? "Correct!"
                    : accentStrippedMatch
                        ? `Correct! Remember the accent: "${q.correctAnswer}"`
                        : `The correct answer was: "${q.correctAnswer}"`,
            });
            return;
        }

        // Reading & Writing: call Ollama for nuanced AI grading
        setGrading(true);
        try {
            // For reading: send passage + question together so Ollama has full context.
            // q.prompt = passage + question; q.question = question only.
            const gradingContext = q.skill === "reading" && q.passage
                ? `${q.passage}\n\n${q.question}`
                : (q.question || q.prompt);

            const res = await evaluate(
                test.ollama_model || "llama3.1:8b",
                q.skill,
                gradingContext,
                answer,
                q.correctAnswer,
                test.level
            );

            setResult(res);
        } catch (err) {
            console.error("Grading error:", err);
            setResult({
                score: 0,
                maxScore: MAX_SCORE[q.skill] || 10,
                isCorrect: false,
                correction: q.correctAnswer,
                explanation: `AI grading unavailable. Expected: "${q.correctAnswer}"`,
            });
        } finally {
            setGrading(false);
        }
    };

    // ─── Advance to next question ─────────────────────────────────────────────
    const handleNext = useCallback(async () => {

        if (!result) return;

        const q = currentQuestion;
        const newAnswers = [...answers, {
            questionId: q.id,
            skill: q.skill,
            question: q.question || q.prompt,
            userAnswer: answer,
            correctAnswer: q.correctAnswer,
            ...result,
        }];
        setAnswers(newAnswers);

        if (currentIdx + 1 >= totalQ) {
            // End of test — calculate totals and save session
            const totalScore = newAnswers.reduce((s, a) => s + (a.score || 0), 0);
            const totalMax = newAnswers.reduce((s, a) => s + (a.maxScore || 10), 0);
            try {
                await saveSession(testId, totalScore, totalMax, newAnswers);
            } catch (err) {
                console.error("Failed to save session:", err);
            }
            navigate(`/test/results`, { state: { answers: newAnswers, test, testId } });
        } else {
            setCurrentIdx(prev => prev + 1);
            setAnswer("");
            setResult(null);
            setGrading(false);
            setHasListened(false);
        }
    }, [result, currentQuestion, answers, currentIdx, totalQ, testId, answer, navigate]);

    // Enter key → next question (when result is showing)
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Enter" && result && !grading) {
                e.preventDefault();
                handleNext();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [result, grading, handleNext]);

    if (!testId) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <AlertCircle size={40} />
                <p>No test ID found. Please go back and select a test.</p>
                <button onClick={() => navigate("/test")} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-colors">Back to Tests</button>
            </div>
        );
    }
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <Loader2 size={32} className="animate-spin" />
                <p className="text-sm">Loading test…</p>
            </div>
        );
    }
    if (loadError || !test) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <AlertCircle size={40} />
                <p>{loadError || "Test not found"}</p>
                <button onClick={() => navigate("/test")} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-colors">Back to Tests</button>
            </div>
        );
    }
    if (!currentQuestion) return null;

    const q = currentQuestion;
    const skillCfg = SKILL_LABELS[q.skill] || {};
    const lvlCfg = DELE_LEVELS[test.level] || {};
    const isWriting = q.skill === "writing";
    const isListening = q.skill === "listening";
    const isReading = q.skill === "reading";

    return (
        <div className="flex flex-col h-full">
            {/* ── Top bar ─────────────────────────────────────────────────────────── */}
            <div className={`flex items-center gap-3 px-4 py-3 border-b ${theme.border}`}>
                <button onClick={() => navigate("/test")} className="btn-icon shrink-0">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${lvlCfg.badge || "bg-violet-600"}`}>
                            {test.level}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${SKILL_COLORS[q.skill]}`}>
                            {skillCfg.icon} {skillCfg.label}
                        </span>
                        <span className="text-xs text-slate-500 ml-auto">{currentIdx + 1} / {totalQ}</span>
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-white/5">
                <div
                    className="h-full bg-violet-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* ── Main content ─────────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start p-6">
                <div className="w-full max-w-2xl">

                    {/* Reading: passage */}
                    {isReading && q.passage && (
                        <div className={`${theme.panel} border ${theme.border} rounded-2xl p-5 mb-6`}>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">📖 Read the passage</p>
                            <p className="text-white leading-relaxed text-base whitespace-pre-wrap">{q.passage}</p>
                            {result?.correction && (
                                <p className="text-xs text-slate-500 mt-3 italic">(Translation available in results)</p>
                            )}
                        </div>
                    )}

                    {/* Writing: key vocabulary hint */}
                    {isWriting && q.keyVocabulary?.length > 0 && !result && (
                        <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <Lightbulb size={14} className="text-amber-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-amber-300 font-semibold mb-1">Useful vocabulary</p>
                                <p className="text-xs text-amber-200/70">{q.keyVocabulary.join(" • ")}</p>
                            </div>
                        </div>
                    )}

                    {/* Question prompt */}
                    <div className="mb-6">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                            {isListening ? "Listening task" : isReading ? "Question" : isWriting ? "Writing task" : "Vocabulary"}
                        </p>
                        <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                            {isListening ? q.promptDisplay || "🔊 Listen and type what you hear" : q.question}
                        </h2>
                    </div>

                    {/* Listening play button */}
                    {isListening && (
                        <div className="flex items-center gap-3 mb-6">
                            <button
                                onClick={() => speakText(q.prompt)}
                                disabled={ttsPlaying}
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white transition-all
                  ${ttsPlaying
                                        ? "bg-sky-700 opacity-60 cursor-not-allowed"
                                        : "bg-sky-600 hover:bg-sky-500 shadow-lg shadow-sky-600/25"
                                    }`}
                            >
                                <Volume2 size={18} className={ttsPlaying ? "animate-pulse" : ""} />
                                {ttsPlaying ? "Playing…" : hasListened ? "Play again" : "▶ Play audio"}
                            </button>
                            {!hasListened && !result && (
                                <p className="text-xs text-slate-500">Listen first, then type below</p>
                            )}
                        </div>
                    )}

                    {/* Answer input */}
                    {!result ? (
                        <form onSubmit={handleSubmit} className="space-y-3">
                            {isWriting ? (
                                <textarea
                                    ref={textareaRef}
                                    value={answer}
                                    onChange={e => setAnswer(e.target.value)}
                                    placeholder="Write your response in Spanish…"
                                    rows={6}
                                    className={`w-full px-4 py-3 rounded-xl text-base text-white resize-none outline-none border-2 transition-all
                    ${theme.bg} border-white/10 focus:border-violet-500`}
                                />
                            ) : (
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={answer}
                                    onChange={e => setAnswer(e.target.value)}
                                    disabled={isListening && !hasListened}
                                    placeholder={isListening ? (hasListened ? "Type what you heard…" : "Listen first…") : "Type your answer in Spanish…"}
                                    className={`w-full px-5 py-4 rounded-xl text-lg text-white outline-none border-2 transition-all
                    ${theme.bg} border-white/10 focus:border-violet-500
                    ${isListening && !hasListened ? "opacity-40 cursor-not-allowed" : ""}`}
                                />
                            )}

                            <button
                                type="submit"
                                disabled={!answer.trim() || grading || (isListening && !hasListened)}
                                className={`w-full py-3 rounded-xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all
                  ${!answer.trim() || grading || (isListening && !hasListened)
                                        ? "bg-slate-700 opacity-50 cursor-not-allowed"
                                        : "bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-500/25 active:scale-[0.98]"
                                    }`}
                            >
                                {grading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Grading with AI…
                                    </>
                                ) : "Submit Answer"}
                            </button>
                        </form>
                    ) : (
                        /* ── Result card ─────────────────────────────────────────────── */
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Score banner */}
                            <div className={`flex items-center gap-3 p-4 rounded-2xl border-2
                ${result.isCorrect
                                    ? "border-emerald-500 bg-emerald-500/10"
                                    : "border-red-500 bg-red-500/10"
                                }`}
                            >
                                <div className={`p-2 rounded-full ${result.isCorrect ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                                    {result.isCorrect
                                        ? <Check size={22} className="text-emerald-400" />
                                        : <X size={22} className="text-red-400" />
                                    }
                                </div>
                                <div className="flex-1">
                                    <p className={`font-bold text-lg ${result.isCorrect ? "text-emerald-300" : "text-red-300"}`}>
                                        {result.isCorrect ? "Correct!" : "Incorrect"}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">{result.explanation}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={`text-2xl font-black ${result.isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                                        {result.score}
                                        <span className="text-base font-normal text-slate-500">/{result.maxScore}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Accent reminder — yellow tip box */}
                            {result.accentReminder && (
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                    <Lightbulb size={15} className="text-amber-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-amber-300 mb-0.5">¡Acento! Remember the accent mark</p>
                                        <p className="text-sm text-amber-200">
                                            You wrote: <span className="line-through opacity-60">{answer}</span>
                                            {" → "}
                                            <span className="font-bold">{result.accentReminder}</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Correction (for writing / reading) */}
                            {(isWriting || isReading) && result.correction && result.correction !== answer && (
                                <div className={`${theme.panel} border ${theme.border} rounded-2xl p-4`}>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                                        {isWriting ? "✍️ Corrected version" : "✅ Ideal answer"}
                                    </p>
                                    <p className="text-white text-sm leading-relaxed italic">{result.correction}</p>
                                </div>
                            )}

                            {/* For vocab/listening: show correct answer if wrong */}
                            {!result.isCorrect && (q.skill === "vocabulary" || q.skill === "listening") && (
                                <div className={`${theme.panel} border ${theme.border} rounded-xl p-3`}>
                                    <p className="text-xs text-slate-500 mb-1">Correct answer</p>
                                    <p className="text-white font-bold text-lg">{result.correction}</p>
                                    {q.hint && <p className="text-xs text-slate-500 mt-1">({q.hint})</p>}
                                </div>
                            )}

                            {/* Next button */}
                            <button
                                onClick={handleNext}
                                className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/25 active:scale-[0.98]"
                            >
                                {currentIdx + 1 >= totalQ ? (
                                    <>
                                        <GraduationCap size={18} />
                                        View Results
                                    </>
                                ) : (
                                    <>
                                        Next Question
                                        <ChevronRight size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
