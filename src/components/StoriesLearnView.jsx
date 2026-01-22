import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, SkipForward, SkipBack, Settings2, Volume2, VolumeX, Loader2 } from "lucide-react";

export default function StoriesLearnView({ theme, settings, updateSetting, storyId }) {
    const navigate = useNavigate();
    const containerRef = useRef(null);

    const [story, setStory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(true); // Default to enabled

    // Settings with defaults
    const textAlign = settings?.storiesTextAlign || "center";
    const visibleLines = settings?.storiesVisibleLines || 3;
    const lineOpacity = settings?.storiesLineOpacity || 0.3;
    const frontLang = settings?.frontLang || "en_US";
    const backLang = settings?.backLang || "es_ES";

    const API_BASE = "http://localhost:3001";

    // TTS Language mapping
    const getTtsLang = (langCode) => {
        const langMap = {
            "en_US": "en-US",
            "es_ES": "es-ES",
            "vi_VN": "vi-VN",
            "de_DE": "de-DE",
        };
        return langMap[langCode] || "en-US";
    };

    // Speak function that returns a promise
    const speakText = (text, langCode, voiceURI) => {
        return new Promise((resolve) => {
            if (!window.speechSynthesis || !text) {
                resolve();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = langCode;
            utterance.pitch = settings?.ttsPitch || 1.0;
            utterance.rate = settings?.ttsRate || 1.0;
            utterance.volume = settings?.ttsVolume || 1.0;

            if (voiceURI) {
                const voices = window.speechSynthesis.getVoices();
                const selectedVoice = voices.find(v => v.voiceURI === voiceURI);
                if (selectedVoice) utterance.voice = selectedVoice;
            }

            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();

            window.speechSynthesis.speak(utterance);
        });
    };

    // Auto-speak when line changes
    useEffect(() => {
        let cancelled = false;

        const speakSequence = async () => {
            if (ttsEnabled && story && story.lines && story.lines[currentIndex]) {
                const line = story.lines[currentIndex];
                const frontText = line[frontLang] || line.en_US || "";
                const backText = line[backLang] || line.es_ES || "";

                // Cancel any ongoing speech
                window.speechSynthesis.cancel();

                // Speak front first, wait for it to finish
                if (!cancelled) {
                    await speakText(frontText, getTtsLang(frontLang), settings?.[`ttsVoice_${frontLang}`]);
                }

                // Then speak back
                if (!cancelled) {
                    await speakText(backText, getTtsLang(backLang), settings?.[`ttsVoice_${backLang}`]);
                }
            }
        };

        speakSequence();

        return () => {
            cancelled = true;
            window.speechSynthesis.cancel();
        };
    }, [ttsEnabled, currentIndex, story]);

    // Stop speech when TTS disabled
    useEffect(() => {
        if (!ttsEnabled && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }, [ttsEnabled]);

    useEffect(() => {
        loadStory();
    }, [storyId]);

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

    // Auto-play functionality
    useEffect(() => {
        let timer;
        if (isPlaying && story && currentIndex < story.lines.length - 1) {
            timer = setTimeout(() => {
                setCurrentIndex((prev) => prev + 1);
            }, 3000); // 3 seconds per line
        } else if (isPlaying && story && currentIndex >= story.lines.length - 1) {
            setIsPlaying(false);
        }
        return () => clearTimeout(timer);
    }, [isPlaying, currentIndex, story]);

    const goNext = () => {
        if (story && currentIndex < story.lines.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const goPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "ArrowRight" || e.key === " ") {
            e.preventDefault();
            goNext();
        } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            goPrev();
        } else if (e.key === "p") {
            setIsPlaying((prev) => !prev);
        }
    };

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentIndex, story]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400">
                <Loader2 size={32} className="animate-spin" />
            </div>
        );
    }

    if (!story) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <p>Story not found</p>
                <button
                    onClick={() => navigate("/stories")}
                    className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white"
                >
                    Back to Stories
                </button>
            </div>
        );
    }

    const lines = story.lines || [];
    const totalLines = lines.length;

    // Calculate which lines to show
    const getLineStyle = (index) => {
        const distance = Math.abs(index - currentIndex);
        const isCurrent = index === currentIndex;

        if (distance > visibleLines) {
            return { opacity: 0, transform: "scale(0.8)", display: "none" };
        }

        const opacity = isCurrent ? 1 : Math.max(lineOpacity, 1 - distance * 0.3);
        const scale = isCurrent ? 1 : Math.max(0.85, 1 - distance * 0.05);
        const blur = isCurrent ? 0 : distance * 0.5;

        return {
            opacity,
            transform: `scale(${scale})`,
            filter: `blur(${blur}px)`,
        };
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/stories")}
                        className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-lg font-semibold text-white">{story.name}</h2>
                        <p className="text-xs text-slate-500">
                            Line {currentIndex + 1} of {totalLines}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-2 rounded-lg transition-all ${showSettings ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/10"
                        }`}
                >
                    <Settings2 size={20} />
                </button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className={`p-4 border-b border-white/10 ${theme.panel} space-y-4`}>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                Text Align
                            </label>
                            <div className="flex gap-1">
                                {["left", "center", "right"].map((align) => (
                                    <button
                                        key={align}
                                        onClick={() => updateSetting("storiesTextAlign", align)}
                                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium ${textAlign === align
                                            ? "bg-emerald-600 text-white"
                                            : "bg-white/5 text-slate-400 hover:bg-white/10"
                                            }`}
                                    >
                                        {align.charAt(0).toUpperCase() + align.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                Visible Lines: {visibleLines}
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="5"
                                value={visibleLines}
                                onChange={(e) => updateSetting("storiesVisibleLines", parseInt(e.target.value))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                Other Lines Opacity: {Math.round(lineOpacity * 100)}%
                            </label>
                            <input
                                type="range"
                                min="10"
                                max="80"
                                value={lineOpacity * 100}
                                onChange={(e) => updateSetting("storiesLineOpacity", parseInt(e.target.value) / 100)}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Lyrics Display */}
            <div
                ref={containerRef}
                className="flex-1 overflow-hidden flex flex-col justify-center px-8 py-12"
                onClick={goNext}
            >
                <div
                    className="space-y-6 transition-all duration-500"
                    style={{ textAlign }}
                >
                    {lines.map((line, index) => {
                        const style = getLineStyle(index);
                        if (style.display === "none") return null;

                        const isCurrent = index === currentIndex;

                        return (
                            <div
                                key={index}
                                className={`transition-all duration-500 ${isCurrent ? "cursor-default" : "cursor-pointer"}`}
                                style={style}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentIndex(index);
                                }}
                            >
                                {/* Front Language */}
                                <p
                                    className={`font-bold transition-all duration-300 ${isCurrent ? "text-3xl sm:text-4xl text-white" : "text-xl sm:text-2xl text-slate-300"
                                        }`}
                                >
                                    {line[frontLang] || line.en_US}
                                </p>
                                {/* Back Language - only show for current */}
                                {isCurrent && (
                                    <p className="text-lg sm:text-xl text-emerald-400 mt-2 animate-fadeIn">
                                        {line[backLang] || line.es_ES}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 p-6 border-t border-white/10">
                {/* TTS Toggle */}
                <button
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className={`p-3 rounded-full transition-all ${ttsEnabled
                        ? "bg-indigo-600 text-white"
                        : "hover:bg-white/10 text-slate-400 hover:text-white"
                        }`}
                    title={ttsEnabled ? "Voice On" : "Voice Off"}
                >
                    {ttsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>

                <button
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="p-3 rounded-full hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                >
                    <SkipBack size={24} />
                </button>
                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all"
                >
                    {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                </button>
                <button
                    onClick={goNext}
                    disabled={currentIndex >= totalLines - 1}
                    className="p-3 rounded-full hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                >
                    <SkipForward size={24} />
                </button>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-white/10">
                <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / totalLines) * 100}%` }}
                />
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
        </div>
    );
}
