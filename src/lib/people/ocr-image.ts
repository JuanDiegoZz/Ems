export type OcrRegion = { x: number; y: number; width: number; height: number };
export type OcrRegionResult = { blob: Blob; previewUrl: string; original: { width: number; height: number }; source: { x: number; y: number; width: number; height: number }; processed: { width: number; height: number } };
export type OcrPreprocess = "original" | "contrast" | "soft-threshold";
export type OcrCardRegions = { card: OcrRegionResult; detection: OcrRegion & { score: number } };
export type OcrPlateRegions = { plate: OcrRegionResult; number: OcrRegionResult; detection: OcrRegion & { score: number } };

type LumaSource = { width: number; height: number; luma: Uint8Array | Uint8ClampedArray };

function average(integral: Float64Array, width: number, x: number, y: number, w: number, h: number) {
  const right = x + w; const bottom = y + h;
  const sum = integral[bottom * (width + 1) + right] - integral[y * (width + 1) + right] - integral[bottom * (width + 1) + x] + integral[y * (width + 1) + x];
  return sum / Math.max(1, w * h);
}

/** Pure detector used by the client canvas pipeline and unit tests. */
export function detectCardRegionFromLuma({ width, height, luma }: LumaSource): OcrCardRegions["detection"] {
  const integral = new Float64Array((width + 1) * (height + 1));
  let total = 0;
  for (let y = 0; y < height; y += 1) {
    let row = 0;
    for (let x = 0; x < width; x += 1) { row += luma[y * width + x] ?? 0; total += luma[y * width + x] ?? 0; integral[(y + 1) * (width + 1) + x + 1] = integral[y * (width + 1) + x + 1] + row; }
  }
  const overall = total / Math.max(1, width * height);
  let best = { x: 0.05, y: 0.12, width: 0.9, height: 0.76, score: -Infinity };
  const aspects = [1.35, 1.5, 1.65, 1.8, 2];
  for (let widthRatio = 0.45; widthRatio <= 0.9; widthRatio += 0.1) {
    for (const aspect of aspects) {
      const heightRatio = widthRatio / aspect;
      if (heightRatio < 0.25 || heightRatio > 0.78) continue;
      for (let xRatio = 0.03; xRatio + widthRatio <= 0.98; xRatio += 0.05) {
        for (let yRatio = 0.03; yRatio + heightRatio <= 0.97; yRatio += 0.05) {
          const x = Math.max(0, Math.floor(xRatio * width)); const y = Math.max(0, Math.floor(yRatio * height)); const w = Math.max(1, Math.floor(widthRatio * width)); const h = Math.max(1, Math.floor(heightRatio * height));
          const inside = average(integral, width, x, y, w, h);
          const outside = (total - inside * w * h) / Math.max(1, width * height - w * h);
          const score = (inside - outside) * 0.72 + (inside - overall) * 0.28;
          if (score > best.score) best = { x: x / width, y: y / height, width: w / width, height: h / height, score };
        }
      }
    }
  }
  return best.score >= 4 ? best : { x: 0.05, y: 0.12, width: 0.9, height: 0.76, score: best.score };
}

/** Detects a bright vertical badge without depending on the screenshot resolution. */
export function detectPlateRegionFromLuma({ width, height, luma }: LumaSource): OcrPlateRegions["detection"] {
  const integral = new Float64Array((width + 1) * (height + 1));
  let total = 0;
  for (let y = 0; y < height; y += 1) {
    let row = 0;
    for (let x = 0; x < width; x += 1) { row += luma[y * width + x] ?? 0; total += luma[y * width + x] ?? 0; integral[(y + 1) * (width + 1) + x + 1] = integral[y * (width + 1) + x + 1] + row; }
  }
  const overall = total / Math.max(1, width * height);
  let best = { x: 0.25, y: 0.08, width: 0.5, height: 0.84, score: -Infinity };
  const ratios = [0.42, 0.5, 0.58, 0.66, 0.76, 0.86];
  for (let widthRatio = 0.18; widthRatio <= 0.62; widthRatio += 0.08) {
    for (const ratio of ratios) {
      const heightRatio = widthRatio / ratio;
      if (heightRatio < 0.34 || heightRatio > 0.92) continue;
      for (let xRatio = 0.03; xRatio + widthRatio <= 0.97; xRatio += 0.04) {
        for (let yRatio = 0.02; yRatio + heightRatio <= 0.98; yRatio += 0.04) {
          const x = Math.floor(xRatio * width); const y = Math.floor(yRatio * height); const w = Math.max(1, Math.floor(widthRatio * width)); const h = Math.max(1, Math.floor(heightRatio * height));
          const inside = average(integral, width, x, y, w, h); const outside = (total - inside * w * h) / Math.max(1, width * height - w * h); const centerPenalty = Math.abs((xRatio + widthRatio / 2) - 0.5) * 8; const score = (inside - outside) * 0.7 + (inside - overall) * 0.3 - centerPenalty;
          if (score > best.score) best = { x: x / width, y: y / height, width: w / width, height: h / height, score };
        }
      }
    }
  }
  return best.score >= 4 ? best : { x: 0.25, y: 0.08, width: 0.5, height: 0.84, score: best.score };
}

function imageLuma(bitmap: ImageBitmap) {
  const width = 96; const height = Math.max(48, Math.round(width * bitmap.height / bitmap.width));
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d"); if (!context) throw new Error("No se pudo analizar la imagen");
  context.drawImage(bitmap, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const luma = new Uint8Array(width * height);
  for (let index = 0; index < luma.length; index += 1) luma[index] = Math.round((pixels[index * 4] * 0.299) + (pixels[index * 4 + 1] * 0.587) + (pixels[index * 4 + 2] * 0.114));
  return { width, height, luma };
}

function toBlob(canvas: HTMLCanvasElement) { return new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("No se pudo crear el recorte")), "image/png")); }

function applySoftThreshold(context: CanvasRenderingContext2D, width: number, height: number) {
  const image = context.getImageData(0, 0, width, height);
  let low = 255; let high = 0;
  for (let index = 0; index < image.data.length; index += 4) {
    const value = image.data[index] ?? 0;
    if (value < low) low = value;
    if (value > high) high = value;
  }
  const range = Math.max(24, high - low);
  for (let index = 0; index < image.data.length; index += 4) {
    const value = Math.max(0, Math.min(255, (((image.data[index] ?? 0) - low) * 255) / range));
    const softened = value < 150 ? value * 0.82 : Math.min(255, 150 + (value - 150) * 1.18);
    image.data[index] = softened; image.data[index + 1] = softened; image.data[index + 2] = softened;
  }
  context.putImageData(image, 0, 0);
}

async function processSource(bitmap: CanvasImageSource, source: { x: number; y: number; width: number; height: number }, original: { width: number; height: number }, targetWidth = source.width * 3, preprocess: OcrPreprocess = "contrast"): Promise<OcrRegionResult> {
  const scale = Math.max(2, targetWidth / Math.max(1, source.width));
  const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(source.width * scale)); canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d"); if (!context) throw new Error("No se pudo preparar la imagen");
  context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
  if (preprocess !== "original") context.filter = "grayscale(1) contrast(1.15) brightness(1.04)";
  context.drawImage(bitmap, source.x, source.y, source.width, source.height, 0, 0, canvas.width, canvas.height);
  if (preprocess === "soft-threshold") applySoftThreshold(context, canvas.width, canvas.height);
  return { blob: await toBlob(canvas), previewUrl: canvas.toDataURL("image/png"), original, source, processed: { width: canvas.width, height: canvas.height } };
}

export async function createOcrRegion(file: File, region: OcrRegion): Promise<OcrRegionResult> {
  const bitmap = await createImageBitmap(file); const original = { width: bitmap.width, height: bitmap.height }; const source = { x: Math.round(bitmap.width * region.x), y: Math.round(bitmap.height * region.y), width: Math.max(1, Math.round(bitmap.width * region.width)), height: Math.max(1, Math.round(bitmap.height * region.height)) }; const result = await processSource(bitmap, source, original); bitmap.close(); return result;
}

/** Crops a normalized region from an already prepared image (used after spatial OCR finds an anchor). */
export async function createOcrRegionFromBlob(blob: Blob, region: OcrRegion, targetWidth?: number): Promise<OcrRegionResult> {
  const bitmap = await createImageBitmap(blob);
  const original = { width: bitmap.width, height: bitmap.height };
  const source = { x: Math.round(bitmap.width * region.x), y: Math.round(bitmap.height * region.y), width: Math.max(1, Math.round(bitmap.width * region.width)), height: Math.max(1, Math.round(bitmap.height * region.height)) };
  const result = await processSource(bitmap, source, original, targetWidth ?? source.width * 3);
  bitmap.close();
  return result;
}

export async function createOcrVariantFromBlob(blob: Blob, region: OcrRegion, preprocess: OcrPreprocess, targetWidth?: number): Promise<OcrRegionResult> {
  const bitmap = await createImageBitmap(blob);
  const original = { width: bitmap.width, height: bitmap.height };
  const source = { x: Math.round(bitmap.width * region.x), y: Math.round(bitmap.height * region.y), width: Math.max(1, Math.round(bitmap.width * region.width)), height: Math.max(1, Math.round(bitmap.height * region.height)) };
  const result = await processSource(bitmap, source, original, targetWidth ?? source.width * 3, preprocess);
  bitmap.close();
  return result;
}

export async function getOcrImageDimensions(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

export async function createOcrCardRegions(file: File): Promise<OcrCardRegions> {
  const bitmap = await createImageBitmap(file); const original = { width: bitmap.width, height: bitmap.height }; const detection = detectCardRegionFromLuma(imageLuma(bitmap));
  const cardSource = { x: Math.round(bitmap.width * detection.x), y: Math.round(bitmap.height * detection.y), width: Math.max(1, Math.round(bitmap.width * detection.width)), height: Math.max(1, Math.round(bitmap.height * detection.height)) };
  const cardCanvas = document.createElement("canvas"); cardCanvas.width = 1000; cardCanvas.height = 600; const cardContext = cardCanvas.getContext("2d"); if (!cardContext) throw new Error("No se pudo preparar la tarjeta"); cardContext.fillStyle = "#fff"; cardContext.fillRect(0, 0, cardCanvas.width, cardCanvas.height); cardContext.drawImage(bitmap, cardSource.x, cardSource.y, cardSource.width, cardSource.height, 0, 0, cardCanvas.width, cardCanvas.height);
  const card = { blob: await toBlob(cardCanvas), previewUrl: cardCanvas.toDataURL("image/png"), original, source: cardSource, processed: { width: cardCanvas.width, height: cardCanvas.height } };
  bitmap.close(); return { card, detection };
}

export async function createOcrPlateRegions(file: File): Promise<OcrPlateRegions> {
  const bitmap = await createImageBitmap(file); const original = { width: bitmap.width, height: bitmap.height }; const detection = detectPlateRegionFromLuma(imageLuma(bitmap));
  const plateSource = { x: Math.round(bitmap.width * detection.x), y: Math.round(bitmap.height * detection.y), width: Math.max(1, Math.round(bitmap.width * detection.width)), height: Math.max(1, Math.round(bitmap.height * detection.height)) };
  const plateCanvas = document.createElement("canvas"); plateCanvas.width = 900; plateCanvas.height = Math.max(520, Math.round(900 * plateSource.height / plateSource.width)); const plateContext = plateCanvas.getContext("2d"); if (!plateContext) throw new Error("No se pudo preparar la placa"); plateContext.fillStyle = "#fff"; plateContext.fillRect(0, 0, plateCanvas.width, plateCanvas.height); plateContext.filter = "grayscale(1) contrast(1.15) brightness(1.04)"; plateContext.drawImage(bitmap, plateSource.x, plateSource.y, plateSource.width, plateSource.height, 0, 0, plateCanvas.width, plateCanvas.height);
  const plate = { blob: await toBlob(plateCanvas), previewUrl: plateCanvas.toDataURL("image/png"), original, source: plateSource, processed: { width: plateCanvas.width, height: plateCanvas.height } };
  const numberRegion = { x: 0.1, y: 0.68, width: 0.8, height: 0.25 }; const source = { x: Math.round(plateCanvas.width * numberRegion.x), y: Math.round(plateCanvas.height * numberRegion.y), width: Math.max(1, Math.round(plateCanvas.width * numberRegion.width)), height: Math.max(1, Math.round(plateCanvas.height * numberRegion.height)) };
  const number = { ...(await processSource(plateCanvas, source, original, 1200)), source: { x: plateSource.x + Math.round(plateSource.width * numberRegion.x), y: plateSource.y + Math.round(plateSource.height * numberRegion.y), width: Math.round(plateSource.width * numberRegion.width), height: Math.round(plateSource.height * numberRegion.height) } };
  bitmap.close(); return { plate, number, detection };
}
