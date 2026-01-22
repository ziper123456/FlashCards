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
  Home,
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
  view,
}) {
  const isVocabularyView = view === "menu" || view === "learn" || view === "import" ||
    view === "play-quick" || view === "play-challenge" || view === "options";
  const isWelcome = view === "welcome";

  return (
    <header
      className={`flex items-center justify-between p-4 ${theme.panel} border-b ${theme.border} z-20 shadow-xl`}
    >
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => setView("welcome")}
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
        {/* Home button - always visible except on welcome */}
        {!isWelcome && (
          <button
            onClick={() => setView("welcome")}
            className={`btn-icon ${theme.border}`}
            title="Home"
          >
            <Home size={18} />
          </button>
        )}

        <button
          onClick={() => {
            if (setPrevView) setPrevView(prevView);
            setView("options");
          }}
          className={`btn-icon ${theme.border}`}
        >
          <Settings size={18} />
        </button>

        {/* Vocabulary-specific controls */}
        {isVocabularyView && (
          <>
            <button
              onClick={() => updateSetting("isReversed", !settings.isReversed)}
              className={`btn-toggle ${settings.isReversed ? `active ${theme.accent} ${theme.onAccent}` : `inactive ${theme.border}`}`}
            >
              <ArrowRightLeft size={14} />
              <span className="hidden xs:inline">
                {settings.isReversed ? "Reversed" : "Normal"}
              </span>
            </button>
            <button
              onClick={() => setView("import")}
              className={`btn-compact ${theme.border}`}
            >
              <Plus size={14} />
              <span className="hidden xs:inline">Import</span>
            </button>
            <div className={`h-8 w-px ${theme.border} mx-1`} />
            <button
              onClick={() => startSession("learn")}
              disabled={filteredMasterDeck.length === 0}
              className={`btn-compact ${filteredMasterDeck.length === 0 ? "btn-disabled" : `${theme.accent} ${theme.onAccent}`}`}
            >
              <BookOpen size={14} />
              <span className="hidden sm:inline">Learn</span>
            </button>
            <button
              onClick={() => startSession("play-quick")}
              disabled={filteredMasterDeck.length === 0}
              className={`btn-compact ${filteredMasterDeck.length === 0 ? "btn-disabled" : "bg-emerald-600 hover:bg-emerald-500 text-white"}`}
            >
              <Zap size={14} />
              <span className="hidden sm:inline">Blitz</span>
            </button>
            <button
              onClick={() => startSession("play-challenge")}
              disabled={filteredMasterDeck.length === 0}
              className={`btn-compact ${filteredMasterDeck.length === 0 ? "btn-disabled" : `${theme.accent} ${theme.onAccent}`}`}
            >
              <Target size={14} />
              <span className="hidden sm:inline">Challenge</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
