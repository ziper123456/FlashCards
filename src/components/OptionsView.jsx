import React from "react";
import {
  Palette,
  Type,
  Layers,
  Timer,
  ListOrdered,
  Move,
  Maximize,
  RotateCcw,
} from "lucide-react";
import THEMES from "../themes";

export default function OptionsView({
  theme,
  settings,
  updateSetting,
  setView,
  prevView,
  resetAllProgress,
}) {
  return (
    <div className="w-full h-full p-6 sm:p-10 overflow-y-auto">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-12 pb-20">
        <div className="space-y-12">
          <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
          <section>
            <div className="flex items-center gap-3 text-white font-bold mb-6 uppercase tracking-wider text-sm">
              <Palette size={18} className={theme.textAccent} /> Visual Themes
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => updateSetting("themeKey", key)}
                  className={`flex flex-col gap-2 p-3 rounded-xl border-2 transition-all ${
                    settings.themeKey === key
                      ? `border-white scale-105 shadow-xl`
                      : "border-transparent bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div
                    className={`w-full h-12 rounded-lg ${t.bg} border ${t.border} flex items-center justify-center`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full ${t.accent} border border-white/20`}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-white text-center">
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-3 text-white font-bold mb-6 uppercase tracking-wider text-sm">
                  <Type size={18} className={theme.textAccent} /> Typography
                </div>
                <div
                  className={`p-6 rounded-2xl ${theme.panel} border ${theme.border}`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-300 font-medium">
                      Font Size
                    </span>
                    <span className={`${theme.textAccent} font-mono font-bold`}>
                      {settings.fontSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    step="1"
                    value={settings.fontSize}
                    onChange={(e) =>
                      updateSetting("fontSize", parseInt(e.target.value))
                    }
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${theme.bg}`}
                    style={{ accentColor: theme.accent.replace("bg-", "") }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 text-white font-bold mb-6 uppercase tracking-wider text-sm">
                  <Layers size={18} className={theme.textAccent} /> Card Visuals
                </div>
                <div
                  className={`p-6 rounded-2xl ${theme.panel} border ${theme.border}`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-300 font-medium">
                      Solidness (Opacity)
                    </span>
                    <span className={`${theme.textAccent} font-mono font-bold`}>
                      {Math.round(settings.cardOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={settings.cardOpacity}
                    onChange={(e) =>
                      updateSetting("cardOpacity", parseFloat(e.target.value))
                    }
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${theme.bg}`}
                    style={{ accentColor: theme.accent.replace("bg-", "") }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 text-white font-bold mb-6 uppercase tracking-wider text-sm">
                  <Timer size={18} className={theme.textAccent} /> Blitz Reveal
                </div>
                <div
                  className={`p-6 rounded-2xl ${theme.panel} border ${theme.border}`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-300 font-medium">
                      Vanishing Delay
                    </span>
                    <span className={`${theme.textAccent} font-mono font-bold`}>
                      {(settings.fadeTime / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="10000"
                    step="500"
                    value={settings.fadeTime}
                    onChange={(e) =>
                      updateSetting("fadeTime", parseInt(e.target.value))
                    }
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${theme.bg}`}
                    style={{ accentColor: theme.accent.replace("bg-", "") }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-3 text-white font-bold mb-6 uppercase tracking-wider text-sm">
                  <ListOrdered size={18} className={theme.textAccent} /> Session
                  Rules
                </div>
                <div
                  className={`p-6 rounded-2xl ${theme.panel} border ${theme.border} space-y-4`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-slate-300 font-medium">
                        Max Active Cards (Orbit)
                      </span>
                      <span
                        className={`${theme.textAccent} font-mono font-bold`}
                      >
                        {settings.maxOrbitSize}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="200"
                      step="5"
                      value={settings.maxOrbitSize}
                      onChange={(e) =>
                        updateSetting("maxOrbitSize", parseInt(e.target.value))
                      }
                      className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${theme.bg}`}
                      style={{ accentColor: theme.accent.replace("bg-", "") }}
                    />
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <button
                      onClick={resetAllProgress}
                      className="w-full py-2 flex items-center justify-center gap-2 text-red-400 hover:bg-red-900/20 border border-transparent hover:border-red-900/50 rounded-lg transition-all text-sm font-medium"
                    >
                      <RotateCcw size={14} /> Reset Study Progress
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 text-white font-bold mb-6 uppercase tracking-wider text-sm">
                  <Move size={18} className={theme.textAccent} /> Orbit Physics
                </div>
                <div
                  className={`p-6 rounded-2xl ${theme.panel} border ${theme.border}`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-300 font-medium">
                      Flying Speed
                    </span>
                    <span className={`${theme.textAccent} font-mono font-bold`}>
                      {settings.cardSpeed.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="5.0"
                    step="0.1"
                    value={settings.cardSpeed}
                    onChange={(e) =>
                      updateSetting("cardSpeed", parseFloat(e.target.value))
                    }
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${theme.bg}`}
                    style={{ accentColor: theme.accent.replace("bg-", "") }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 text-white font-bold mb-6 uppercase tracking-wider text-sm">
                  <Maximize size={18} className={theme.textAccent} /> Dimensions
                </div>
                <div
                  className={`p-6 rounded-2xl ${theme.panel} border ${theme.border} space-y-4`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                        Width
                      </span>
                      <span className="text-xs text-white">
                        {settings.cardWidth}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="400"
                      step="4"
                      value={settings.cardWidth}
                      onChange={(e) =>
                        updateSetting("cardWidth", parseInt(e.target.value))
                      }
                      className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${theme.bg}`}
                      style={{ accentColor: theme.accent.replace("bg-", "") }}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                        Height
                      </span>
                      <span className="text-xs text-white">
                        {settings.cardHeight}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="250"
                      step="4"
                      value={settings.cardHeight}
                      onChange={(e) =>
                        updateSetting("cardHeight", parseInt(e.target.value))
                      }
                      className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${theme.bg}`}
                      style={{ accentColor: theme.accent.replace("bg-", "") }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
          <div className="flex justify-start">
            <button
              onClick={() => setView(prevView || "menu")}
              className={`${theme.accent} ${theme.onAccent} px-12 py-3 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all`}
            >
              Return to {prevView === "menu" || !prevView ? "Menu" : "Session"}
            </button>
          </div>
        </div>

        <div className="lg:sticky lg:top-10 h-fit">
          <div className="flex items-center gap-3 text-white font-bold mb-6 uppercase tracking-wider text-sm">
            Interactive Preview
          </div>
          <div
            className={`w-full min-h-[650px] rounded-[2.5rem] ${theme.panel} border-2 border-dashed ${theme.border} flex flex-col items-center justify-start py-12 gap-12 relative overflow-hidden bg-opacity-40`}
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 0.3px, transparent 0)`,
                backgroundSize: "30px 30px",
              }}
            ></div>
            <div className="text-center z-10 w-full flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-4 px-4 py-1 rounded-full bg-white/5">
                Orbit Card Appearance
              </span>
              <div
                style={{
                  width: `${settings.cardWidth}px`,
                  height: `${settings.cardHeight}px`,
                  backgroundColor: `rgba(${theme.rgb}, ${settings.cardOpacity})`,
                }}
                className={`border rounded-xl flex items-center justify-center p-3 text-center font-medium shadow-2xl backdrop-blur-md transition-all ${theme.card} text-white`}
              >
                <span style={{ fontSize: `${settings.fontSize}px` }}>
                  Sample Word
                </span>
              </div>
            </div>
            <div className="text-center z-10 w-full flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-4 px-4 py-1 rounded-full bg-white/5">
                Blitz Reveal State
              </span>
              <div
                style={{
                  width: `${settings.cardWidth}px`,
                  height: `${settings.cardHeight}px`,
                  backgroundColor: `rgba(16, 185, 129, 1)`,
                }}
                className={`border rounded-xl flex flex-col items-center justify-center p-3 text-center transition-all shadow-2xl backdrop-blur-md border-emerald-400 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)]`}
              >
                <span
                  className="font-bold leading-tight break-words px-1"
                  style={{ fontSize: `${settings.fontSize}px` }}
                >
                  Meaning
                </span>
                <div className="w-3/4 h-px bg-white/20 my-1.5" />
                <span
                  className="font-light opacity-70 italic truncate w-full px-2"
                  style={{ fontSize: `${settings.fontSize * 0.7}px` }}
                >
                  Original
                </span>
              </div>
            </div>
            <div className="mt-auto pb-6 text-center px-10 z-10">
              <p className="text-xs text-slate-400 leading-relaxed">
                Adjust controls to see changes live. These settings apply to the
                Master Deck grid and both play modes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
