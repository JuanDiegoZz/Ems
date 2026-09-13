"use client";

import type { DniImageVariant } from "./types.ts";

export type DniPreprocess = "original" | "contrast" | "soft";

function toBlob(canvas: HTMLCanvasElement) { return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo preparar la imagen OCR")), "image/png")); }

function softContrast(context: CanvasRenderingContext2D, width: number, height: number) {
  const image = context.getImageData(0, 0, width, height);
  let low = 255; let high = 0;
  for (let index = 0; index < image.data.length; index += 4) { const value = image.data[index] ?? 0; low = Math.min(low, value); high = Math.max(high, value); }
  const range = Math.max(32, high - low);
  for (let index = 0; index < image.data.length; index += 4) { const value = Math.max(0, Math.min(255, (((image.data[index] ?? 0) - low) * 255) / range)); const adjusted = value < 150 ? value * 0.84 : Math.min(255, 150 + (value - 150) * 1.12); image.data[index] = adjusted; image.data[index + 1] = adjusted; image.data[index + 2] = adjusted; }
  context.putImageData(image, 0, 0);
}

async function render(bitmap: ImageBitmap, mode: "A" | "B" | "C", preprocess: DniPreprocess, original: { width: number; height: number }): Promise<DniImageVariant> {
  const scale = Math.min(2.5, Math.max(1, 1600 / bitmap.width));
  const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d"); if (!context) throw new Error("No se pudo preparar el canvas OCR");
  context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
  if (preprocess !== "original") context.filter = "grayscale(1) contrast(1.15) brightness(1.04)";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (preprocess === "soft") softContrast(context, canvas.width, canvas.height);
  return { mode, blob: await toBlob(canvas), previewUrl: canvas.toDataURL("image/png"), original, processed: { width: canvas.width, height: canvas.height }, preprocess: { scale, grayscale: preprocess !== "original", contrast: preprocess === "original" ? "none" : preprocess === "contrast" ? "1.15" : "soft autocontrast" } };
}

export async function createFullImageVariants(file: File, includeSoft = true) {
  const bitmap = await createImageBitmap(file); const original = { width: bitmap.width, height: bitmap.height };
  const variants = [await render(bitmap, "A", "original", original), await render(bitmap, "B", "contrast", original)];
  if (includeSoft) variants.push(await render(bitmap, "C", "soft", original));
  bitmap.close(); return variants;
}

export async function createRegionalVariant(blob: Blob, region: { x: number; y: number; width: number; height: number }, mode: "A" | "B" | "C", targetWidth = 1400) {
  const bitmap = await createImageBitmap(blob); const source = { x: Math.max(0, Math.round(bitmap.width * region.x)), y: Math.max(0, Math.round(bitmap.height * region.y)), width: Math.max(1, Math.round(bitmap.width * region.width)), height: Math.max(1, Math.round(bitmap.height * region.height)) };
  const canvas = document.createElement("canvas"); const scale = Math.max(3, targetWidth / source.width); canvas.width = Math.max(1, Math.round(source.width * scale)); canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d"); if (!context) throw new Error("No se pudo preparar el crop OCR");
  context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); if (mode !== "A") context.filter = "grayscale(1) contrast(1.15) brightness(1.04)"; context.drawImage(bitmap, source.x, source.y, source.width, source.height, 0, 0, canvas.width, canvas.height); if (mode === "C") softContrast(context, canvas.width, canvas.height);
  const result = { blob: await toBlob(canvas), previewUrl: canvas.toDataURL("image/png"), processed: { width: canvas.width, height: canvas.height }, preprocess: { scale, grayscale: mode !== "A", contrast: mode === "A" ? "none" : mode === "B" ? "1.15" : "soft autocontrast" } };
  bitmap.close(); return result;
}
