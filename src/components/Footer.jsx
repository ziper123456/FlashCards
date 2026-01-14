import React from "react";

export default function Footer({ masterDeckLength, theme }) {
  return (
    <footer
      className={`p-3 ${theme.panel} border-t ${theme.border} text-[10px] text-slate-500 flex justify-between uppercase tracking-widest`}
    >
      <span>Master Deck: {masterDeckLength}</span>
      <span className="hidden sm:block">Storage: Browser Local</span>
      <span>Orbit v4.9.2</span>
    </footer>
  );
}
