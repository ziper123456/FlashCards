import React, { useEffect } from "react";
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
  // Get available voices on mount (for speaking only, not for UI)
  const getVoiceForLang = (langCode) => {
    const voiceURI = settings?.[`ttsVoice_${langCode}`] || "";
    if (!voiceURI) return null;
    const voices = window.speechSynthesis?.getVoices() || [];
    return voices.find(v => v.voiceURI === voiceURI) || null;
  };

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
  const speakSingle = (text, ttsLangCode, langSettingKey) => {
    if (!window.speechSynthesis || !text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = ttsLangCode;
    utterance.pitch = settings?.ttsPitch || 1.0;
    utterance.rate = settings?.ttsRate || 1.0;
    utterance.volume = settings?.ttsVolume || 1.0;

    // Try to use selected voice from global settings
    const selectedVoice = getVoiceForLang(langSettingKey);
    if (selectedVoice) utterance.voice = selectedVoice;

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
          speakSingle(frontText, frontTtsLang, displayFrontLang);
        } else {
          // Card flipped - speak ONLY the back (meaning)
          speakSingle(backText, backTtsLang, displayBackLang);
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

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative p-6 perspective-[1500px]">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30 pointer-events-auto">
        <div className={`${theme.panel} ${theme.border} px-4 py-1.5 rounded-full text-label flex items-center gap-2 shadow-2xl backdrop-blur-sm`}>
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
          className={`btn-icon ${theme.panel} ${theme.border}`}
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
          <div className="flex-col-center h-full animate-in fade-in zoom-in">
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
                className={`btn-secondary ${theme.panel} ${theme.border}`}
              >
                Restart Session
              </button>
              <button
                onClick={() => setView("menu")}
                className="btn-secondary"
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

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30">
        {/* TTS Toggle */}
        <button
          onClick={() => setTtsEnabled(!ttsEnabled)}
          className={`btn-toggle ${ttsEnabled ? `active ${theme.accent} ${theme.onAccent}` : "inactive"}`}
          title={ttsEnabled ? "TTS On" : "TTS Off"}
        >
          {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          <span className="hidden sm:inline">{ttsEnabled ? "Voice" : "Muted"}</span>
        </button>

        {/* Auto Play Toggle */}
        <button
          onClick={() => setLearnAutoPlay(!learnAutoPlay)}
          className={`btn-toggle ${learnAutoPlay ? `active ${theme.accent} ${theme.onAccent}` : "inactive"}`}
          title={learnAutoPlay ? "Auto-play On" : "Auto-play Off"}
        >
          {learnAutoPlay ? <PlayIcon size={14} /> : <PauseIcon size={14} />}
          <span className="hidden sm:inline">{learnAutoPlay ? "Auto" : "Manual"}</span>
        </button>

        {/* Delay Selector */}
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-slate-500" />
          <select
            value={learnDelay}
            onChange={(e) => setLearnDelay(parseInt(e.target.value))}
            className={`select-field ${theme.bg} ${theme.border} text-xs px-2 py-1`}
          >
            <option value="1">1s</option>
            <option value="1.5">1.5s</option>
            <option value="2">2s</option>
            <option value="2.5">2.5s</option>
            <option value="3">3s</option>
            <option value="3.5">3.5s</option>
            <option value="4">4s</option>
            <option value="4.5">4.5s</option>
            <option value="5">5s</option>
            <option value="5.5">5.5s</option>
            <option value="6">6s</option>
            <option value="6.5">6.5s</option>
            <option value="7">7s</option>
            <option value="7.5">7.5s</option>
            <option value="8">8s</option>
            <option value="8.5">8.5s</option>
            <option value="9">9s</option>
            <option value="9.5">9.5s</option>
            <option value="10">10s</option>
          </select>
        </div>
      </div>

      {orbitCards.length > 0 && (
        <div className="mt-8 w-full max-w-xl flex justify-center z-20">
          <button
            onClick={handleLearnClick}
            className={`btn-primary w-full sm:w-auto px-8 py-3 ${theme.accent} ${theme.onAccent} shadow-lg`}
          >
            <span>{isFlipped ? "Next" : "Flip"}</span>
            <SkipForward size={16} fill="currentColor" />
          </button>
        </div>
      )}
    </div>
  );
}
