import React from "react";
import {
  Settings,
  Plus,
  Save,
  Brain,
  ArrowRightLeft,
  Copy,
  Download,
  BookOpen,
  Zap,
  Target,
} from "lucide-react";

export default function Header({
  theme,
  saveStatus,
  settings,
  setView,
  prevView,
  setPrevView,
  updateSetting,
  filteredMasterDeck,
  copyToClipboard,
  exportAsJson,
  startSession,
  selectedCategories,
}) {
  return (
    <header
      className={`flex items-center justify-between p-4 ${theme.panel} border-b ${theme.border} z-20 shadow-xl`}
    >
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => setView("menu")}
      >
        <div
          className={`${theme.accent} p-2 rounded-lg ${theme.onAccent} shadow-lg transition-colors duration-500`}
        >
          <Brain size={20} />
        </div>
        <div className="flex flex-col text-white">
          <h1 className="font-bold text-lg leading-none tracking-tight">
            CloudFlash
          </h1>
          <div className="flex items-center gap-1 mt-1">
            <Save
              size={12}
              className={
                saveStatus === "saving"
                  ? "text-amber-400 animate-pulse"
                  : "text-slate-500"
              }
            />
            <span className="text-[9px] text-slate-500 uppercase tracking-tighter hidden xs:block">
              {saveStatus === "saving" ? "Syncing..." : "Ready"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={() => {
            if (setPrevView) setPrevView(prevView);
            setView("options");
          }}
          className={`p-2 rounded-md transition-all border ${theme.border} hover:bg-white/5 text-slate-400 hover:text-white`}
        >
          <Settings size={18} />
        </button>
        <button
          onClick={() => updateSetting("isReversed", !settings.isReversed)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-xs border ${
            settings.isReversed
              ? `${theme.accent} border-transparent ${theme.onAccent}`
              : `${theme.panel} ${theme.border} text-slate-400 hover:text-white`
          }`}
        >
          <ArrowRightLeft size={14} />
          <span className="hidden xs:inline">
            {settings.isReversed ? "Reversed" : "Normal"}
          </span>
        </button>
        <button
          onClick={() => setView("import")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-xs border ${theme.border} hover:bg-white/5 text-slate-400 hover:text-white`}
        >
          <Plus size={14} />
          <span className="hidden xs:inline">Import</span>
        </button>
        <div className={`h-8 w-px ${theme.border} mx-1`} />
        <button
          onClick={() => startSession("learn")}
          disabled={filteredMasterDeck.length === 0}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-xs font-semibold ${
            filteredMasterDeck.length === 0
              ? "bg-slate-800 text-slate-600"
              : `${theme.accent} hover:opacity-90 shadow-lg ${theme.onAccent}`
          }`}
        >
          <BookOpen size={14} />
          <span className="hidden sm:inline">Learn</span>
        </button>
        <button
          onClick={() => startSession("play-quick")}
          disabled={filteredMasterDeck.length === 0}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-xs font-semibold ${
            filteredMasterDeck.length === 0
              ? "bg-slate-800 text-slate-600"
              : "bg-emerald-600 hover:bg-emerald-500 shadow-lg text-white"
          }`}
        >
          <Zap size={14} />
          <span className="hidden sm:inline">Blitz</span>
        </button>
        <button
          onClick={() => startSession("play-challenge")}
          disabled={filteredMasterDeck.length === 0}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-xs font-semibold ${
            filteredMasterDeck.length === 0
              ? "bg-slate-800 text-slate-600"
              : `${theme.accent} hover:opacity-90 shadow-lg ${theme.onAccent}`
          }`}
        >
          <Target size={14} />
          <span className="hidden sm:inline">Challenge</span>
        </button>
      </div>
    </header>
  );
}
