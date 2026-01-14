import React, { useState, useEffect } from "react";
import {
  BookOpen,
  RefreshCw,
  Check,
  Pause as PauseIcon,
  Play as PlayIcon,
  Volume2,
  VolumeX,
  Clock,
  SkipForward,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function LearnView({
  theme,
  displayCount,
  selectedCategories,
  resetOrbit,
  sessionQueue,
  orbitCards,
  learnAnim,
  isFlipped,
  handleCardClick,
  handleRequeue,
  handleLearnClick,
  setView,
  learnAutoPlay,
  setLearnAutoPlay,
  ttsEnabled,
  setTtsEnabled,
  learnDelay,
  setLearnDelay,
  settings,
  updateSetting,
}) {
  const [showTtsSettings, setShowTtsSettings] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);

  // Get available voices on mount
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      setAvailableVoices(voices);
    };

    loadVoices();
    // Voices might load asynchronously
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Determine current text to speak based on card state and language settings
  const currentCard = orbitCards.length > 0 ? orbitCards[0] : null;
  const frontLang = settings?.frontLang || "en_US";
  const backLang = settings?.backLang || "es_ES";

  // Swap display languages when reversed
  const displayFrontLang = settings?.isReversed ? backLang : frontLang;
  const displayBackLang = settings?.isReversed ? frontLang : backLang;

  // Get TTS code from language setting (convert en_US to en-US format)
  const getTtsLang = (langCode) => {
    const langMap = {
      "en_US": "en-US",
      "es_ES": "es-ES",
      "vi_VN": "vi-VN",
      "de_DE": "de-DE",
    };
    return langMap[langCode] || "en-US";
  };

  let textToSpeak = "";
  let currentLang = getTtsLang(frontLang);

  if (currentCard && !learnAnim) {
    if (!isFlipped) {
      textToSpeak = currentCard[frontLang] || "";
      currentLang = getTtsLang(frontLang);
    } else {
      textToSpeak = currentCard[backLang] || "";
      currentLang = getTtsLang(backLang);
    }
  }

  // Custom function to speak a single text with appropriate voice
  const speakSingle = (text, langCode, voiceURI) => {
    if (!window.speechSynthesis || !text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.pitch = settings?.ttsPitch || 1.0;
    utterance.rate = settings?.ttsRate || 1.0;
    utterance.volume = settings?.ttsVolume || 1.0;

    // Try to use selected voice
    if (voiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.voiceURI === voiceURI);
      if (selectedVoice) utterance.voice = selectedVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Auto-speak when card flips or changes (if TTS enabled)
  useEffect(() => {
    if (ttsEnabled && currentCard && !learnAnim) {
      // Use display languages (already swapped if isReversed)
      const frontText = currentCard[displayFrontLang] || "";
      const backText = currentCard[displayBackLang] || "";

      // Get TTS language codes for display languages
      const frontTtsLang = getTtsLang(displayFrontLang);
      const backTtsLang = getTtsLang(displayBackLang);

      // Small delay for visual transition
      const timer = setTimeout(() => {
        if (!isFlipped) {
          // Card just shown - speak front only
          speakSingle(frontText, frontTtsLang, settings?.ttsFrontVoiceURI);
        } else {
          // Card flipped - speak ONLY the back (meaning)
          speakSingle(backText, backTtsLang, settings?.ttsBackVoiceURI);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [ttsEnabled, currentCard?.id, isFlipped, learnAnim, displayFrontLang, displayBackLang]);

  // Stop speech when TTS is disabled
  useEffect(() => {
    if (!ttsEnabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [ttsEnabled]);

  // Filter voices by front display language (respects isReversed)
  const frontVoices = availableVoices.filter((v) => {
    const ttsLang = getTtsLang(displayFrontLang);
    return v.lang.startsWith(ttsLang.split("-")[0]);
  });

  // Filter voices by back display language (respects isReversed)
  const backVoices = availableVoices.filter((v) => {
    const ttsLang = getTtsLang(displayBackLang);
    return v.lang.startsWith(ttsLang.split("-")[0]);
  });

  // Get unique languages from available voices
  const uniqueLanguages = [
    ...new Set(availableVoices.map((v) => v.lang)),
  ].sort();

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative p-6 perspective-[1500px]">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30 pointer-events-auto">
        <div
          className={`${theme.panel} border ${theme.border} px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 shadow-2xl backdrop-blur-sm`}
        >
          <BookOpen size={10} className={theme.textAccent} />
          <span className="text-slate-300 ml-1">{displayCount} left</span>
          <span className="text-slate-500 mx-1">|</span>
          <span className="text-slate-400">
            {selectedCategories.length > 0
              ? selectedCategories.join(" • ")
              : "ALL"}
          </span>
        </div>
        <button
          onClick={resetOrbit}
          className={`${theme.panel} p-1.5 rounded-full border ${theme.border} text-slate-400 hover:text-white`}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl relative">
        {sessionQueue.length > 0 && (
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[220px] sm:w-[500px] sm:h-[300px] pointer-events-none ${learnAnim === "drop" ? "z-20" : "z-0"
              }`}
          >
            <div
              className={`w-full h-full border ${theme.border} rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 text-center`}
              style={{ backgroundColor: `rgba(${theme.rgb}, 0.95)` }}
            >
              <div className="flex-1 flex flex-col items-center justify-center w-full">
                <span
                  className={`text-3xl sm:text-5xl font-medium break-words ${theme.onAccent}`}
                >
                  {sessionQueue[0]
                    ? sessionQueue[0][displayFrontLang] || ""
                    : ""}
                </span>
              </div>
            </div>
          </div>
        )}

        {orbitCards.length > 0 ? (
          orbitCards.map((card) => {
            const front = card[displayFrontLang] || "";
            const back = card[displayBackLang] || "";

            const outerClasses = `relative transition-all duration-500 ${learnAnim === "drop"
              ? "animate-drop z-0"
              : learnAnim === "requeue"
                ? "animate-requeue z-10"
                : "z-10"
              }`;
            return (
              <div key={card.id} className={outerClasses}>
                <div
                  onClick={() => handleCardClick(card)}
                  onContextMenu={(e) => handleRequeue(e, card)}
                  className={`w-[340px] h-[220px] sm:w-[500px] sm:h-[300px] cursor-pointer relative transition-transform duration-700`}
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  <div
                    className={`absolute inset-0 border ${theme.border} rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 text-center hover:border-white/20`}
                    style={{
                      backfaceVisibility: "hidden",
                      backgroundColor: `rgba(${theme.rgb}, 1)`,
                    }}
                  >
                    <div className="flex-1 flex flex-col items-center justify-center w-full">
                      <span
                        className={`text-3xl sm:text-5xl font-medium break-words ${theme.onAccent}`}
                      >
                        {front}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`absolute inset-0 border ${theme.challenge} rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center p-8 text-center`}
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      backgroundColor: `rgba(${theme.rgb}, 1)`,
                    }}
                  >
                    <div className="flex-1 flex flex-col items-center justify-center w-full">
                      <span
                        className={`text-3xl sm:text-5xl font-bold break-words ${theme.onAccent}`}
                      >
                        {back}
                      </span>
                      <div className="w-16 h-px bg-current opacity-20 my-4 mx-auto" />
                      <span
                        className={`text-lg italic ${theme.onAccent} opacity-80`}
                      >
                        {front}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in">
            <Check className="w-16 h-16 text-emerald-500 mb-4" />
            <p className="text-white text-2xl font-medium mb-2">
              You're all caught up!
            </p>
            <p className="text-slate-500 mb-8">
              No more cards in this session.
            </p>
            <div className="flex gap-4">
              <button
                onClick={resetOrbit}
                className={`px-6 py-2 ${theme.panel} border ${theme.border} rounded-lg text-sm text-white`}
              >
                Restart Session
              </button>
              <button
                onClick={() => setView("menu")}
                className={`px-6 py-2 ${theme.accent} ${theme.onAccent} rounded-lg text-sm shadow-lg`}
              >
                Back to Deck
              </button>
            </div>
          </div>
        )}
      </div>

      {orbitCards.length > 0 && (
        <div
          className={`mt-8 w-full max-w-xl ${theme.panel} border ${theme.border} rounded-2xl p-4 flex flex-col gap-4 shadow-xl z-20`}
        >
          {/* Main Controls Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setLearnAutoPlay(!learnAutoPlay)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${learnAutoPlay
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                  : "bg-white/5 text-slate-400 border border-transparent hover:bg-white/10"
                  }`}
              >
                {learnAutoPlay ? (
                  <PauseIcon size={14} fill="currentColor" />
                ) : (
                  <PlayIcon size={14} />
                )}{" "}
                {learnAutoPlay ? "Auto" : "Auto"}
              </button>

              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${ttsEnabled
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50"
                  : "bg-white/5 text-slate-400 border border-transparent hover:bg-white/10"
                  }`}
              >
                {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />} Voice
              </button>

              {/* TTS Settings Toggle */}
              {ttsEnabled && (
                <button
                  onClick={() => setShowTtsSettings(!showTtsSettings)}
                  className={`flex items-center gap-1 px-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${showTtsSettings
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50"
                    : "bg-white/5 text-slate-400 border border-transparent hover:bg-white/10"
                    }`}
                  title="Voice Settings"
                >
                  <Settings size={14} />
                  {showTtsSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}

              {learnAutoPlay && (
                <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                  <Clock size={12} className="text-slate-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Delay</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={learnDelay}
                    onChange={(e) => setLearnDelay(parseFloat(e.target.value))}
                    className={`w-16 h-1.5 rounded-lg appearance-none cursor-pointer ${theme.bg}`}
                    style={{ accentColor: theme.accent.replace("bg-", "") }}
                  />
                  <span className="text-[10px] font-mono text-slate-300 w-6 text-right">
                    {learnDelay}s
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleLearnClick}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 ${theme.accent} ${theme.onAccent} rounded-xl font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all`}
            >
              <span>{isFlipped ? "Next" : "Flip"}</span>
              <SkipForward size={16} fill="currentColor" />
            </button>
          </div>

          {/* TTS Settings Panel (Collapsible) */}
          {ttsEnabled && showTtsSettings && (
            <div className="animate-in slide-in-from-top-2 fade-in border-t border-white/10 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">


              {/* Front Voice Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  🎙️ Front Voice ({frontLang.split("_")[0].toUpperCase()})
                </label>
                <select
                  value={settings?.ttsFrontVoiceURI || ""}
                  onChange={(e) => updateSetting("ttsFrontVoiceURI", e.target.value)}
                  className={`px-2 py-1.5 rounded-lg text-xs ${theme.bg} border ${theme.border} text-white bg-opacity-50`}
                >
                  <option value="">Default</option>
                  {frontVoices.length > 0 ? (
                    frontVoices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No voices for {frontLang}</option>
                  )}
                </select>
              </div>

              {/* Back Voice Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  🎙️ Back Voice ({backLang.split("_")[0].toUpperCase()})
                </label>
                <select
                  value={settings?.ttsBackVoiceURI || ""}
                  onChange={(e) => updateSetting("ttsBackVoiceURI", e.target.value)}
                  className={`px-2 py-1.5 rounded-lg text-xs ${theme.bg} border ${theme.border} text-white bg-opacity-50`}
                >
                  <option value="">Default</option>
                  {backVoices.length > 0 ? (
                    backVoices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No voices for {backLang}</option>
                  )}
                </select>
              </div>

              {/* Pitch Control */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Pitch
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={settings?.ttsPitch || 1.0}
                    onChange={(e) => updateSetting("ttsPitch", parseFloat(e.target.value))}
                    className={`flex-1 h-1.5 rounded-lg appearance-none cursor-pointer ${theme.bg}`}
                  />
                  <span className="text-xs font-mono text-slate-300 w-8 text-right">
                    {(settings?.ttsPitch || 1.0).toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Rate Control */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Speed
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={settings?.ttsRate || 0.9}
                    onChange={(e) => updateSetting("ttsRate", parseFloat(e.target.value))}
                    className={`flex-1 h-1.5 rounded-lg appearance-none cursor-pointer ${theme.bg}`}
                  />
                  <span className="text-xs font-mono text-slate-300 w-8 text-right">
                    {(settings?.ttsRate || 0.9).toFixed(1)}x
                  </span>
                </div>
              </div>

              {/* Volume Control */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Volume
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings?.ttsVolume || 1.0}
                    onChange={(e) => updateSetting("ttsVolume", parseFloat(e.target.value))}
                    className={`flex-1 h-1.5 rounded-lg appearance-none cursor-pointer ${theme.bg}`}
                  />
                  <span className="text-xs font-mono text-slate-300 w-8 text-right">
                    {Math.round((settings?.ttsVolume || 1.0) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
