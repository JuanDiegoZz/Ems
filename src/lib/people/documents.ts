export const MAX_DOCUMENT_BYTES = 1_572_864;
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function documentExtension(file: File): string {
  if (!EXTENSIONS[file.type]) throw new Error("Usa una imagen JPG, PNG o WEBP.");
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error("La imagen supera el tamaño máximo permitido de 1.5 MB.");
  return EXTENSIONS[file.type];
}
