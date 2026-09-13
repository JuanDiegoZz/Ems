"use client";

import { useEffect, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type FocusEvent, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui";
import { getImageFromClipboardItems } from "@/lib/people/clipboard";

/* Blob previews are local runtime URLs; next/image cannot optimize them. */
/* eslint-disable @next/next/no-img-element */

type PasteTarget = "ine" | "badge";

type UploadDropzoneProps = {
  name: string;
  label: string;
  accept?: string;
  hint?: string;
  required?: boolean;
  maxSize?: number;
  onFile?: (file: File) => void;
  onClear?: () => void;
  allowRemove?: boolean;
  formField?: boolean;
  pasteEnabled?: boolean;
  pasteTarget?: PasteTarget;
};

export function UploadDropzone({
  name,
  label,
  accept = "image/jpeg,image/png,image/webp",
  hint = "JPG, PNG o WEBP · Máx 1.5 MB",
  required,
  maxSize = 1.5 * 1024 * 1024,
  onFile,
  onClear,
  allowRemove = false,
  formField = true,
  pasteEnabled = true,
  pasteTarget,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [pasteFeedback, setPasteFeedback] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function select(next: File | undefined, fromClipboard = false) {
    if (!next) return;
    if (!next.type.match(/^image\/(jpeg|png|webp)$/)) {
      setError("Usa una imagen JPG, PNG o WEBP.");
      setPasteFeedback("");
      return;
    }
    if (next.size > maxSize) {
      setError("La imagen supera el máximo de 1.5 MB.");
      setPasteFeedback("");
      return;
    }
    setError("");
    setPasteFeedback(fromClipboard ? "Imagen pegada desde el portapapeles" : "");
    setFile(next);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(next));
    onFile?.(next);
  }

  function clear() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setError("");
    setPasteFeedback("");
    setPreviewOpen(false);
    if (inputRef.current) inputRef.current.value = "";
    onClear?.();
  }

  function handlePaste(event: ReactClipboardEvent<HTMLDivElement>) {
    if (!pasteEnabled || !active) return;
    const pastedFile = getImageFromClipboardItems(event.clipboardData.items);
    if (!pastedFile) return;
    event.preventDefault();
    setActive(true);
    select(pastedFile, true);
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActive(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    inputRef.current?.click();
  }

  const targetLabel = pasteTarget === "badge" ? "placa" : "INE";
  const pasteHint = active ? `Pega una imagen de ${targetLabel} con Ctrl + V` : "Selecciona, arrastra o pega una imagen";

  return <div
    className="grid gap-2"
    tabIndex={0}
    aria-label={`${label}. Puedes seleccionar, arrastrar o pegar una imagen.`}
    onPointerDown={() => setActive(true)}
    onFocusCapture={() => setActive(true)}
    onBlurCapture={handleBlur}
    onKeyDown={handleKeyDown}
    onPaste={handlePaste}
  >
    <label className={`upload-dropzone ${dragging ? "is-dragging" : ""} ${file ? "is-loaded" : ""} ${active ? "is-paste-target" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); select(event.dataTransfer.files[0]); }}>
      <input ref={inputRef} className="sr-only" type="file" name={formField ? name : undefined} accept={accept} required={formField && required && !file} onChange={(event) => select(event.target.files?.[0])} />
      {file && preview ? <img className="upload-preview" src={preview} alt={`Vista previa de ${label}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setPreviewOpen(true); }} /> : <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><Icon name="upload" size={21} /></span>}
      <span><strong className="block text-sm text-[var(--text)]">{file ? `${label} cargada ✓` : label}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{file ? file.name : pasteHint}</span>{!file && <><span className="mt-1 block text-xs text-[var(--muted)]">Ctrl + V para pegar desde el portapapeles</span><span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span></>}</span>
    </label>
    {file && <div className="flex flex-wrap gap-2"><button className="button button-ghost justify-self-start text-xs" type="button" onClick={() => inputRef.current?.click()}>Cambiar imagen</button>{allowRemove && <button className="button button-ghost justify-self-start text-xs" type="button" onClick={clear}>Quitar imagen</button>}</div>}
    {pasteFeedback && <p className="text-xs text-emerald-300" role="status">{pasteFeedback}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {previewOpen && preview && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewOpen(false); }}><div className="glass-card max-h-[90vh] w-full max-w-4xl" role="dialog" aria-modal="true" aria-label={`Vista previa de ${label}`}><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Vista previa de {label}</h2><button className="button button-ghost" type="button" onClick={() => setPreviewOpen(false)}>Cerrar</button></div><img src={preview} alt={`Vista previa completa de ${label}`} className="max-h-[75vh] w-full rounded-xl bg-slate-950 object-contain" /></div></div>}
  </div>;
}

/* eslint-enable @next/next/no-img-element */
