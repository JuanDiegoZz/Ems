"use client";

import { useEffect } from "react";

export type ChoiceDialogOption = { key: string; label: string; tone?: "primary" | "secondary" | "danger" | "ghost" };

export function ChoiceDialog({ open, title, description, details, options, onSelect, onClose }: { open: boolean; title: string; description: string; details?: string; options: ChoiceDialogOption[]; onSelect: (key: string) => void; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="choice-dialog-panel glass-card w-full max-w-md" role="dialog" aria-modal="true" aria-labelledby="choice-dialog-title"><h2 id="choice-dialog-title" className="text-xl font-bold">{title}</h2><p className="mt-3 text-sm text-[var(--text-secondary)]">{description}</p>{details && <p className="mt-3 break-words rounded-xl border border-blue-400/20 bg-blue-400/10 p-3 text-sm text-[var(--text-secondary)]">{details}</p>}<div className="choice-dialog-actions mt-5 flex flex-wrap justify-end gap-3">{options.map((option) => <button className={`button button-${option.tone ?? "secondary"} ${option.tone === "primary" ? "order-first sm:order-none" : ""}`} key={option.key} type="button" onClick={() => onSelect(option.key)}>{option.label}</button>)}</div></div></div>;
}
