import { MAX_DOCUMENT_BYTES } from "./documents.ts";

export type ClipboardItemLike = {
  kind?: string;
  type: string;
  getAsFile: () => Blob | null;
};

export function mimeToExtension(mime: string): string {
  switch (mime.toLowerCase()) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return "img";
  }
}

export function clipboardBlobToFile(blob: Blob, timestamp = Date.now()): File {
  const type = blob.type.toLowerCase();
  return new File([blob], `clipboard-${timestamp}.${mimeToExtension(type)}`, { type });
}

export function validateImageFile(file: File, maxSize = MAX_DOCUMENT_BYTES): string | null {
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) return "Usa una imagen JPG, PNG o WEBP.";
  if (file.size > maxSize) return "La imagen supera el tamaño máximo permitido de 1.5 MB.";
  return null;
}

export function getImageFromClipboardItems(
  items: Iterable<ClipboardItemLike> | ArrayLike<ClipboardItemLike>,
  timestamp = Date.now(),
): File | null {
  for (const item of Array.from(items)) {
    if (!item.type.toLowerCase().startsWith("image/")) continue;
    const blob = item.getAsFile();
    if (blob) return clipboardBlobToFile(blob, timestamp);
  }
  return null;
}
