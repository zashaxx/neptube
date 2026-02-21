"use client";

import { Command } from "lucide-react";

export function CommandPaletteTrigger() {
  return (
    <button
      onClick={() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })
        );
      }}
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground text-xs transition-colors mr-1"
      title="Command palette (Ctrl+K or /)"
    >
      <Command className="h-3 w-3" />
      <kbd className="text-[10px] font-mono">Ctrl+K</kbd>
    </button>
  );
}
