const MAX_DOCUMENT_BYTES = 1_572_864;
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function documentExtension(file: File): string {
  if (!EXTENSIONS[file.type] || file.size > MAX_DOCUMENT_BYTES) throw new Error("Documento inválido: usa JPEG, PNG o WEBP de máximo 1.5 MB");
  return EXTENSIONS[file.type];
}




