"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";

/* Blob previews are local runtime URLs; next/image cannot optimize them. */
/* eslint-disable @next/next/no-img-element */

type UploadDropzoneProps = { name: string; label: string; accept?: string; hint?: string; required?: boolean; maxSize?: number; onFile?: (file: File) => void };

export function UploadDropzone({ name, label, accept = "image/jpeg,image/png,image/webp", hint = "JPG, PNG o WEBP · Máx 1.5 MB", required, maxSize = 1.5 * 1024 * 1024, onFile }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function select(next: File | undefined) {
    if (!next) return;
    if (!next.type.match(/^image\/(jpeg|png|webp)$/)) { setError("Usa una imagen JPG, PNG o WEBP."); return; }
    if (next.size > maxSize) { setError("La imagen supera el máximo de 1.5 MB."); return; }
    setError(""); setFile(next); if (preview) URL.revokeObjectURL(preview); setPreview(URL.createObjectURL(next)); onFile?.(next);
  }
  return <div className="grid gap-2"><label className={`upload-dropzone ${dragging ? "is-dragging" : ""} ${file ? "is-loaded" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); select(event.dataTransfer.files[0]); }}>
    <input ref={inputRef} className="sr-only" type="file" name={name} accept={accept} required={required && !file} onChange={(event) => select(event.target.files?.[0])} />
    {file && preview ? <img className="upload-preview" src={preview} alt={`Vista previa de ${label}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setPreviewOpen(true); }} /> : <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><Icon name="upload" size={21} /></span>}
    <span><strong className="block text-sm text-[var(--text)]">{file ? `${label} cargada ✓` : label}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{file ? file.name : "Arrastra una imagen aquí o toca para seleccionar"}</span>{!file && <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span>}</span>
  </label>{file && <button className="button button-ghost justify-self-start text-xs" type="button" onClick={() => inputRef.current?.click()}>Cambiar imagen</button>}{error && <p className="form-error" role="alert">{error}</p>}{previewOpen && preview && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewOpen(false); }}><div className="glass-card max-h-[90vh] w-full max-w-4xl" role="dialog" aria-modal="true" aria-label={`Vista previa de ${label}`}><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Vista previa de {label}</h2><button className="button button-ghost" type="button" onClick={() => setPreviewOpen(false)}>Cerrar</button></div><img src={preview} alt={`Vista previa completa de ${label}`} className="max-h-[75vh] w-full rounded-xl bg-slate-950 object-contain" /></div></div>}</div>;
}

/* eslint-enable @next/next/no-img-element */



