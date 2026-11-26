import { findCurp, parseMrz, type MrzResult } from "@/lib/mrz";

/**
 * Reads a photo of a passport or ID card in the browser. The picture is drawn onto a canvas and read by
 * Tesseract running in a Web Worker on this device: it is never uploaded, stored, or kept after the read.
 * (Tesseract fetches its own engine and English data on first use; that traffic carries no photo.)
 * Browser-only. The OCR library loads here, on demand, so a visit that never scans never pays for it.
 */

export type ScanRead = { mrz: MrzResult | null; curp: string };

const MRZ_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<";
const MAX_WIDTH = 2000;

async function loadBitmap(file: File): Promise<ImageBitmap> {
  // `from-image` applies the phone's rotation, so a sideways photo is read upright.
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

/** Grey, with the darkest and lightest tones stretched apart: OCR-B on a glossy page needs the contrast. */
function prepare(bitmap: ImageBitmap, region: "bottom" | "all"): HTMLCanvasElement {
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const fullHeight = Math.round(bitmap.height * scale);
  const top = region === "bottom" ? Math.round(fullHeight * 0.6) : 0;
  const height = fullHeight - top;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return canvas;
  context.drawImage(bitmap, 0, bitmap.height * (top / fullHeight), bitmap.width, bitmap.height * (height / fullHeight), 0, 0, width, height);

  const image = context.getImageData(0, 0, width, height);
  const { data } = image;
  let low = 255;
  let high = 0;
  for (let i = 0; i < data.length; i += 4) {
    const grey = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    data[i] = grey;
    if (grey < low) low = grey;
    if (grey > high) high = grey;
  }
  const range = Math.max(high - low, 1);
  for (let i = 0; i < data.length; i += 4) {
    const stretched = Math.min(255, Math.max(0, Math.round(((data[i] - low) / range) * 255)));
    data[i] = data[i + 1] = data[i + 2] = stretched;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

/**
 * Reads the strip, and a CURP if there is one. `onProgress` is 0 to 1 across the whole job.
 * Tries the bottom of the picture first, where a passport keeps its strip, then the whole picture.
 */
export async function scanDocument(file: File, onProgress: (fraction: number) => void): Promise<ScanRead> {
  const { createWorker, PSM } = await import("tesseract.js");
  let stage = 0;
  const worker = await createWorker("eng", 1, {
    logger: (message) => {
      if (message.status === "recognizing text") onProgress(Math.min(0.98, 0.2 + (stage + message.progress) * 0.4));
      else if (message.status.includes("loading")) onProgress(0.05 + message.progress * 0.15);
    },
  });
  try {
    const bitmap = await loadBitmap(file);
    await worker.setParameters({ tessedit_char_whitelist: MRZ_CHARACTERS, preserve_interword_spaces: "1" });

    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const bottom = (await worker.recognize(prepare(bitmap, "bottom"))).data.text;
    let mrz = parseMrz(bottom);
    let curp = findCurp(bottom);

    if (!mrz?.confident) {
      stage = 1;
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      const whole = (await worker.recognize(prepare(bitmap, "all"))).data.text;
      const again = parseMrz(whole);
      if (again && (!mrz || again.confident)) mrz = again;
      curp ||= findCurp(whole);
    }
    bitmap.close();
    onProgress(1);
    return { mrz, curp };
  } finally {
    await worker.terminate();
  }
}
