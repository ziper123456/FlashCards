import React from "react";
import { Zap, Target, RefreshCw, Check, Eye, X } from "lucide-react";

export default function PlayView(props) {
  const {
    theme,
    view,
    orbitCards,
    sessionQueue,
    containerRef,
    displayCount,
    selectedCategories,
    resetOrbit,
    revealedIds,
    fadingIds,
    settings,
    handleCardClick,
    handleRequeue,
    handleMouseLeaveCard,
    activeCard,
    feedback,
    answer,
    setAnswer,
    checkAnswer,
    setActiveCard,
    attempts,
    playAutoRandom,
    setPlayAutoRandom,
    skipActiveAndRandomNext,
  } = props;

  return (
    <>
      <div
        ref={containerRef}
        className="w-full h-full relative overflow-hidden select-none"
      >
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30 pointer-events-auto">
          <div
            className={`${theme.panel} border ${theme.border} px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 shadow-2xl backdrop-blur-sm`}
          >
            {view === "play-quick" ? (
              <Zap size={10} className="text-emerald-400" />
            ) : (
              <Target size={10} className={theme.textAccent} />
            )}
            <span className="text-slate-300 ml-1">{displayCount} left</span>
            <span className="text-slate-500 mx-1">|</span>
            <span className="text-slate-400">
              {selectedCategories.length > 0
                ? `${selectedCategories.length} CATS`
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
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 0.3px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        ></div>

        {orbitCards.map((card) => {
          const isRevealed = revealedIds.includes(card.id);
          const isFading = fadingIds.includes(card.id);
          const frontLang = settings?.frontLang || "en_US";
          const backLang = settings?.backLang || "es_ES";
          const initialDisplay = card[frontLang] || "";
          const revealedDisplay = card[backLang] || "";
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              onContextMenu={(e) => handleRequeue(e, card)}
              onMouseLeave={() => handleMouseLeaveCard(card.id)}
              style={{
                width: `${settings.cardWidth}px`,
                height: `${settings.cardHeight}px`,
                transform: `translate(${card.x}px, ${card.y}px) ${isRevealed ? "scale(1.25)" : "scale(1)"
                  }`,
                transition: isFading
                  ? `transform 0.4s ease-out, opacity ${(settings.fadeTime / 1000) * 0.8
                  }s ease-out`
                  : isRevealed
                    ? "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                    : "transform 0.016s linear",
                opacity: isFading ? 0 : 1,
                backgroundColor: isRevealed
                  ? `rgba(5, 150, 105, 1)`
                  : `rgba(${theme.rgb}, ${settings.cardOpacity})`,
                pointerEvents: isFading ? "none" : "auto",
                zIndex: isRevealed ? 50 : 1,
              }}
              className={`absolute border rounded-xl flex flex-col items-center justify-center p-3 text-center transition-all shadow-lg backdrop-blur-sm ${isRevealed
                  ? "border-emerald-400 text-white shadow-[0_0_20px_rgba(5,150,105,0.4)]"
                  : `${theme.card} text-white`
                }`}
            >
              {isRevealed ? (
                <div className="flex flex-col items-center justify-center w-full">
                  <span
                    className="font-bold leading-tight break-words px-1"
                    style={{ fontSize: `${settings.fontSize}px` }}
                  >
                    {revealedDisplay}
                  </span>
                  <div className="w-3/4 h-px bg-white/20 my-1.5" />
                  <span
                    className="opacity-70 italic truncate w-full px-2"
                    style={{ fontSize: `${settings.fontSize * 0.7}px` }}
                  >
                    {initialDisplay}
                  </span>
                </div>
              ) : (
                <span
                  className="font-medium overflow-hidden text-ellipsis line-clamp-2"
                  style={{ fontSize: `${settings.fontSize}px` }}
                >
                  {initialDisplay}
                </span>
              )}
            </button>
          );
        })}

        {orbitCards.length === 0 && sessionQueue.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-emerald-400 text-xl font-medium">
              Session Complete!
            </p>
            <div className="flex gap-4 mt-6">
              <button
                onClick={resetOrbit}
                className={`px-6 py-2 ${theme.panel} border ${theme.border} rounded-lg text-sm text-white`}
              >
                Play Again
              </button>
              <button
                onClick={() => setActiveCard(null)}
                className={`px-6 py-2 ${theme.accent} ${theme.onAccent} rounded-lg text-sm shadow-lg`}
              >
                Back to Deck
              </button>
            </div>
          </div>
        )}
      </div>

      {activeCard && view === "play-challenge" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div
            className={`w-full max-w-sm ${theme.panel
              } border-2 rounded-3xl p-8 shadow-2xl transition-all ${feedback === "correct"
                ? "border-green-500"
                : feedback === "wrong"
                  ? "border-red-500 animate-shake"
                  : feedback === "revealing"
                    ? "border-yellow-500"
                    : theme.challenge
              }`}
          >
            <div className="flex justify-between items-start mb-6 text-white">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                  {(activeCard.categories || []).join(", ")}
                </span>
                <span className={`text-xs font-bold ${theme.textAccent}`}>
                  Recall Challenge
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlayAutoRandom(!playAutoRandom)}
                  className={`text-slate-300 px-2 py-1 rounded-md text-xs border ${playAutoRandom ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'border-transparent hover:bg-white/5'}`}>
                  {playAutoRandom ? 'Auto Random: ON' : 'Auto Random: OFF'}
                </button>
                <button
                  onClick={() => skipActiveAndRandomNext()}
                  className={`text-slate-300 px-2 py-1 rounded-md text-xs border hover:bg-white/5`}
                >
                  Skip
                </button>
                <button
                  onClick={() => {
                    setActiveCard(null);
                  }}
                  className="text-slate-500 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="text-center mb-10 text-white">
              <h3 className="text-4xl font-bold mb-2 break-words">
                {activeCard[settings?.frontLang || "en_US"] || ""}
              </h3>
              <p className="text-slate-500 text-sm">
                {feedback === "revealing" ? "Reviewing..." : "Type the meaning"}
              </p>
            </div>
            <form onSubmit={checkAnswer}>
              <input
                autoFocus
                disabled={feedback === "revealing"}
                type="text"
                className={`w-full ${theme.bg
                  } border-b-2 outline-none p-3 text-xl text-center mb-6 transition-all text-white ${feedback === "revealing"
                    ? "border-yellow-500 text-yellow-400"
                    : `border-white/10 focus:border-white`
                  }`}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="..."
                autoComplete="off"
              />
              <div className="flex justify-center h-12">
                {feedback === "correct" ? (
                  <div className="text-green-400 font-bold animate-bounce flex items-center gap-2">
                    <Check /> Correct!
                  </div>
                ) : feedback === "revealing" ? (
                  <div className="text-yellow-400 font-bold flex items-center gap-2">
                    <Eye size={18} /> Reviewing...
                  </div>
                ) : feedback === "wrong" ? (
                  <div className="text-red-400 font-bold">
                    Try again ({attempts}/3)
                  </div>
                ) : (
                  <button
                    type="submit"
                    className={`w-full ${theme.accent} ${theme.onAccent} py-3 rounded-xl font-bold shadow-lg`}
                  >
                    Check Answer
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
