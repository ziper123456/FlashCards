import React from "react";
import { Brain, Trash2, RefreshCw } from "lucide-react";

export default function DeckGrid({
  renderedDeck,
  theme,
  settings,
  deleteCard,
  observerRef,
}) {
  // Get text for current language pair
  const frontLang = settings?.frontLang || "en_US";
  const backLang = settings?.backLang || "es_ES";

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 pb-4">
        {renderedDeck.map((card) => {
          const frontText = card[frontLang] || card.front || "";
          const backText = card[backLang] || card.back || "";

          return (
            <div
              key={card.id}
              className={`group relative h-28 ${theme.panel} rounded-xl border ${theme.border} hover:border-white/20 transition-all p-3 flex flex-col justify-center text-center shadow-lg`}
            >
              <div className="absolute top-2 left-2 flex items-center gap-1 opacity-40">
                <Brain size={10} />{" "}
                <span className="text-[9px]">{card.studyCount || 0}</span>
              </div>
              <div
                className={`font-bold ${theme.textAccent} truncate px-2`}
                style={{ fontSize: `${settings.fontSize}px` }}
                title={frontText}
              >
                {frontText}
              </div>
              <div
                className="text-slate-500 truncate px-2 italic"
                style={{ fontSize: `${settings.fontSize * 0.8}px` }}
                title={backText}
              >
                {backText}
              </div>
              <button
                onClick={() => deleteCard(card.id)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-red-400 transition-all bg-black/40 rounded-lg"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
      <div
        ref={observerRef}
        className="h-20 flex items-center justify-center text-slate-600 text-xs gap-2"
      >
        {" "}
        <RefreshCw size={14} className="animate-spin" /> Loading more...
      </div>
    </>
  );
}
