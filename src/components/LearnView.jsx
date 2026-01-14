import React from "react";
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
}) {
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
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[220px] sm:w-[500px] sm:h-[300px] pointer-events-none ${
              learnAnim === "drop" ? "z-20" : "z-0"
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
                    ? settings && settings.isReversed
                      ? sessionQueue[0].back
                      : sessionQueue[0].front
                    : ""}
                </span>
              </div>
            </div>
          </div>
        )}

        {orbitCards.length > 0 ? (
          orbitCards.map((card) => {
            const front =
              settings && settings.isReversed ? card.back : card.front;
            const back =
              settings && settings.isReversed ? card.front : card.back;

            const outerClasses = `relative transition-all duration-500 ${
              learnAnim === "drop"
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
          className={`mt-8 w-full max-w-xl ${theme.panel} border ${theme.border} rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl z-20`}
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setLearnAutoPlay(!learnAutoPlay)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                learnAutoPlay
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
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                ttsEnabled
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50"
                  : "bg-white/5 text-slate-400 border border-transparent hover:bg-white/10"
              }`}
            >
              {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />} Voice
            </button>

            {learnAutoPlay && (
              <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                <Clock size={12} className="text-slate-500" />
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
      )}
    </div>
  );
}
