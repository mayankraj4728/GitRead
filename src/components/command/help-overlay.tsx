"use client";

import { CommandOverlay } from "./command-overlay";
import { useUi } from "@/stores/ui";

const SHORTCUTS: Array<[string[], string]> = [
  [["⌘", "K"], "Open command palette"],
  [["/"], "Search this repository"],
  [["t"], "Cycle theme"],
  [["z"], "Toggle Zen mode"],
  [["b"], "Bookmark current document"],
  [["["], "Previous document"],
  [["]"], "Next document"],
  [["?"], "Show this help"],
  [["Esc"], "Close overlays"],
];

export function HelpOverlay() {
  const open = useUi((s) => s.overlay === "help");
  if (!open) return null;

  return (
    <CommandOverlay when="help" labelledBy="help-title">
      <div className="border-b border-border px-5 py-3">
        <h2 id="help-title" className="text-sm font-semibold">
          Keyboard shortcuts
        </h2>
      </div>
      <ul className="p-3">
        {SHORTCUTS.map(([keys, label]) => (
          <li key={label} className="flex items-center justify-between px-2 py-2 text-sm">
            <span className="text-foreground/90">{label}</span>
            <span className="flex gap-1">
              {keys.map((k) => (
                <kbd
                  key={k}
                  className="min-w-6 rounded border border-border bg-muted px-1.5 py-0.5 text-center text-xs font-medium"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </CommandOverlay>
  );
}
