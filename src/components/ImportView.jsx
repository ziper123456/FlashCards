import React from "react";
import { FileText, Upload, AlertCircle } from "lucide-react";

export default function ImportView({
  theme,
  fileInputRef,
  handleFileUploads,
  inputText,
  setInputText,
  handleImport,
  importError,
  setView,
}) {
  return (
    <div className="max-w-xl mx-auto p-4 sm:p-8 h-full overflow-y-auto pb-20">
      <h2 className="text-2xl font-semibold mb-2 text-white">Import Words</h2>
      <div className="grid grid-cols-1 gap-6 mb-8">
        <div
          className={`${theme.panel} border ${theme.border} p-4 rounded-xl shadow-lg`}
        >
          <div
            className={`flex items-center gap-2 ${theme.textAccent} font-bold text-sm mb-2`}
          >
            <FileText size={18} /> Import Files (.csv, .txt)
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,.txt"
            multiple
            onChange={handleFileUploads}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`${theme.accent} ${theme.onAccent} w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all`}
          >
            <Upload size={16} /> Choose Files
          </button>
        </div>
        <textarea
          className={`w-full h-48 ${theme.panel} border ${theme.border} rounded-xl p-4 font-mono text-sm focus:ring-2 focus:ring-white/20 outline-none transition-all text-white`}
          placeholder={`Category > Word : Meaning`}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
          }}
        />
      </div>
      {importError && (
        <div
          className={`mt-3 flex items-center gap-2 text-xs ${theme.textAccent} animate-pulse`}
        >
          <AlertCircle size={14} /> {importError}
        </div>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => setView("menu")}
          className="px-4 py-2 text-slate-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          onClick={handleImport}
          disabled={!inputText.trim()}
          className={`${theme.accent} ${theme.onAccent} disabled:bg-slate-800 disabled:text-slate-500 px-6 py-2 rounded-lg font-semibold`}
        >
          Add to Deck
        </button>
      </div>
    </div>
  );
}
