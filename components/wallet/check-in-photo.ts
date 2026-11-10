import { MAX_CHECK_IN_PHOTO_BYTES, PHOTO_MAX_EDGE } from "@/lib/check-in";

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Redraws a picked photo as a JPEG no larger than the server accepts. Drawing it again also drops
 * the camera's metadata (including where it was taken) and applies the phone's rotation. Returns
 * null when the file is not an image the browser can read.
 */
export async function prepareJpeg(file: File): Promise<Blob | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }

  try {
    let edge = PHOTO_MAX_EDGE;
    // Lower quality first, then a smaller picture, until it fits.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.82, 0.68, 0.54]) {
        const blob = await toBlob(canvas, quality);
        if (blob && blob.size <= MAX_CHECK_IN_PHOTO_BYTES) return blob;
      }
      edge = Math.round(edge * 0.75);
    }
    return null;
  } finally {
    bitmap.close();
  }
}
