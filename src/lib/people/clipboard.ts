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
