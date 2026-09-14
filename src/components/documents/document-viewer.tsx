"use client";

import { useEffect, useState } from "react";
import { perfTimer } from "@/lib/perf";

type DocumentViewerProps = { personId: string; personName: string; kind: "ine" | "badge"; label: string };

/* Signed URLs are runtime values from private Storage, so next/image cannot optimize them safely here. */
/* eslint-disable @next/next/no-img-element */
export function DocumentViewer({ personId, personName, kind, label }: DocumentViewerProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [urlExpiresAt, setUrlExpiresAt] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function show() {
    setOpen(true);
    if (url && urlExpiresAt > Date.now()) return;
    setStatus("loading"); setUrl(null);
    const done = perfTimer(`signed document ${kind}`);
    try {
      const response = await fetch(`/api/people/${personId}/documents/${kind}`);
      const data = await response.json() as { url?: string };
      if (!response.ok || !data.url) throw new Error();
      setUrl(data.url); setUrlExpiresAt(Date.now() + 270000); setStatus("idle");
    } catch { setStatus("error"); } finally { done(); }
  }

  return <>
    <button className="button button-secondary" type="button" onClick={show} disabled={status === "loading"}>{status === "loading" ? "Cargando…" : label}</button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="glass-card max-h-[90vh] w-full max-w-3xl overflow-auto p-4" role="dialog" aria-modal="true" aria-label={`${label}: ${personName}`}>
        <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">{label}</h2><p className="text-sm text-[var(--muted)]">{personName}</p></div><button className="button button-ghost" type="button" onClick={() => setOpen(false)}>Cerrar</button></div>
        {status === "loading" && <p className="p-8 text-center text-sm text-[var(--muted)]">Cargando documento…</p>}
        {status === "error" && <p className="p-8 text-center text-sm text-red-600">No se pudo cargar el documento.</p>}
        {url && <><img src={url} alt={`${label} de ${personName}`} className="max-h-[70vh] w-full rounded-xl bg-white object-contain" /><a className="mt-3 inline-flex text-sm text-blue-600" href={url} target="_blank" rel="noreferrer">Abrir imagen en nueva pestaña</a></>}
      </div>
    </div>}
  </>;
}
/* eslint-enable @next/next/no-img-element */
