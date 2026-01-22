import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, SkipForward, Loader2, Trophy } from "lucide-react";

export default function StoriesChallengeView({ theme, settings, storyId }) {
    const navigate = useNavigate();
    const inputRef = useRef(null);

    const [story, setStory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answer, setAnswer] = useState("");
    const [feedback, setFeedback] = useState(null); // "correct" | "wrong" | "revealing"
    const [attempts, setAttempts] = useState(0);
    const [score, setScore] = useState({ correct: 0, wrong: 0 });
    const [completed, setCompleted] = useState(false);

    const frontLang = settings?.frontLang || "en_US";
    const backLang = settings?.backLang || "es_ES";

    const API_BASE = "http://localhost:3001";

    useEffect(() => {
        loadStory();
    }, [storyId]);

    useEffect(() => {
        if (inputRef.current && !completed) {
            inputRef.current.focus();
        }
    }, [currentIndex, completed]);

    const loadStory = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/stories/${storyId}`);
            const data = await res.json();
            if (data.lines) {
                setStory(data);
            }
        } catch (err) {
            console.error("Failed to load story:", err);
        }
        setLoading(false);
    };

    const normalizeText = (text) => {
        return text
            .toLowerCase()
            .trim()
            .replace(/[.,!?;:'"¿¡]/g, "")
            .replace(/\s+/g, " ");
    };

    const checkAnswer = (e) => {
        e.preventDefault();
        if (!story || feedback === "revealing") return;

        const line = story.lines[currentIndex];
        const correctAnswer = line[backLang] || line.es_ES || "";

        if (normalizeText(answer) === normalizeText(correctAnswer)) {
            setFeedback("correct");
            setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));

            setTimeout(() => {
                goToNext();
            }, 1000);
        } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);

            if (newAttempts >= 3) {
                setFeedback("revealing");
                setAnswer(correctAnswer);
                setScore((prev) => ({ ...prev, wrong: prev.wrong + 1 }));

                setTimeout(() => {
                    goToNext();
                }, 2500);
            } else {
                setFeedback("wrong");
                setTimeout(() => setFeedback(null), 800);
            }
        }
    };

    const goToNext = () => {
        if (currentIndex < story.lines.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            setAnswer("");
            setFeedback(null);
            setAttempts(0);
        } else {
            setCompleted(true);
        }
    };

    const skipLine = () => {
        setScore((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
        goToNext();
    };

    const restart = () => {
        setCurrentIndex(0);
        setAnswer("");
        setFeedback(null);
        setAttempts(0);
        setScore({ correct: 0, wrong: 0 });
        setCompleted(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400">
                <Loader2 size={32} className="animate-spin" />
            </div>
        );
    }

    if (!story) {
        return (
            <div className="flex-col-center h-full text-slate-400">
                <p>Story not found</p>
                <button
                    onClick={() => navigate("/stories")}
                    className="btn-secondary bg-purple-600 text-white mt-4"
                >
                    Back to Stories
                </button>
            </div>
        );
    }

    const lines = story.lines || [];
    const totalLines = lines.length;
    const currentLine = lines[currentIndex];

    // Completion Screen
    if (completed) {
        const percentage = Math.round((score.correct / totalLines) * 100);

        return (
            <div className="flex-col-center h-full p-8 text-center">
                <Trophy
                    size={64}
                    className={percentage >= 70 ? "text-amber-400" : "text-slate-500"}
                />
                <h2 className="text-heading-lg text-white mt-6">Challenge Complete!</h2>
                <p className="text-slate-400 mt-2">{story.name}</p>

                <div className="mt-8 grid-3-cols gap-8">
                    <div className="text-center">
                        <p className="text-4xl font-bold text-emerald-400">{score.correct}</p>
                        <p className="text-label text-slate-500 mt-1">Correct</p>
                    </div>
                    <div className="text-center">
                        <p className="text-4xl font-bold text-red-400">{score.wrong}</p>
                        <p className="text-label text-slate-500 mt-1">Wrong</p>
                    </div>
                    <div className="text-center">
                        <p className="text-4xl font-bold text-white">{percentage}%</p>
                        <p className="text-label text-slate-500 mt-1">Score</p>
                    </div>
                </div>

                <div className="mt-10 flex gap-4">
                    <button
                        onClick={restart}
                        className="btn-primary bg-purple-600 hover:bg-purple-500 text-white"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => navigate("/stories")}
                        className="btn-secondary"
                    >
                        Back to Stories
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-between p-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/stories")}
                        className="btn-icon"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-lg font-semibold text-white">{story.name}</h2>
                        <p className="text-xs text-slate-500">
                            Line {currentIndex + 1} of {totalLines} • {score.correct} correct
                        </p>
                    </div>
                </div>
                <button
                    onClick={skipLine}
                    className="btn-compact text-slate-400 hover:text-white"
                >
                    <SkipForward size={16} />
                    Skip
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                {/* Front Language (Question) */}
                <div className="text-center mb-12">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                        Translate this line
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-white max-w-xl leading-relaxed">
                        {currentLine[frontLang] || currentLine.en_US}
                    </p>
                </div>

                {/* Answer Input */}
                <form onSubmit={checkAnswer} className="w-full max-w-xl">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            disabled={feedback === "correct" || feedback === "revealing"}
                            placeholder="Type your answer..."
                            className={`w-full px-6 py-4 rounded-xl text-lg ${theme.bg} border-2 transition-all outline-none ${feedback === "correct"
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                                : feedback === "wrong"
                                    ? "border-red-500 animate-shake"
                                    : feedback === "revealing"
                                        ? "border-amber-500 bg-amber-500/10 text-amber-400"
                                        : `${theme.border} text-white focus:border-purple-500`
                                }`}
                        />

                        {/* Feedback Icon */}
                        {feedback && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                {feedback === "correct" && <Check size={24} className="text-emerald-400" />}
                                {feedback === "wrong" && <X size={24} className="text-red-400" />}
                            </div>
                        )}
                    </div>

                    {/* Attempts indicator */}
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                        <span>
                            {attempts > 0 && feedback !== "correct" && `Attempts: ${attempts}/3`}
                        </span>
                        <span>Press Enter to submit</span>
                    </div>
                </form>

                {/* Revealing message */}
                {feedback === "revealing" && (
                    <p className="mt-4 text-sm text-amber-400 animate-pulse">
                        The correct answer is shown above
                    </p>
                )}
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-white/10">
                <div
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / totalLines) * 100}%` }}
                />
            </div>
        </div>
    );
}
