/**
 * Image utilities for client-side compression before persisting to IndexedDB.
 *
 * IndexedDB has practical caps (tens-to-hundreds of MB depending on browser
 * + storage pressure). A single full-resolution photo can be 4-15 MB as a
 * base64 data URL. We downscale and re-encode every uploaded image, and
 * (optionally) iteratively reduce quality/dimension until the encoded byte
 * size lands under a target — keeping uploads small enough to persist many
 * of them without hitting quota.
 */

export interface CompressOptions {
  maxDimension?: number;     // longest edge in px (default 1280)
  quality?: number;          // initial JPEG quality 0..1 (default 0.8)
  mimeType?: string;         // output mime (default 'image/jpeg')
  targetMaxBytes?: number;   // if set, iteratively shrink until under this size
  minQuality?: number;       // lower-bound quality during iteration (default 0.4)
  minDimension?: number;     // lower-bound longest edge during iteration (default 480)
}

/**
 * Reads a File, decodes it, downscales (if larger than `maxDimension` on
 * the longest edge), and returns a base64 data URL of the compressed JPEG.
 *
 * If `targetMaxBytes` is provided, repeatedly re-encodes with lower quality
 * and (if still too big) smaller dimensions until the output is under target,
 * or until the floor settings are hit.
 *
 * Falls back to the original FileReader result if anything goes wrong.
 */
export async function compressImageFile(file: File, opts: CompressOptions = {}): Promise<string> {
  const {
    maxDimension = 1280,
    quality = 0.8,
    mimeType = 'image/jpeg',
    targetMaxBytes,
    minQuality = 0.4,
    minDimension = 480,
  } = opts;

  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const original = reader.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const { width: w0, height: h0 } = img;

          const encodeAt = (dim: number, q: number): string | null => {
            const longest = Math.max(w0, h0);
            const scale = longest > dim ? dim / longest : 1;
            const w = Math.max(1, Math.round(w0 * scale));
            const h = Math.max(1, Math.round(h0 * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            ctx.drawImage(img, 0, 0, w, h);
            return canvas.toDataURL(mimeType, q);
          };

          let dim = maxDimension;
          let q = quality;
          let best = encodeAt(dim, q);
          if (!best) { resolve(original); return; }

          if (targetMaxBytes) {
            // Iteratively reduce quality first, then dimension, until under target.
            while (dataUrlByteSize(best) > targetMaxBytes && q > minQuality) {
              q = Math.max(minQuality, q - 0.1);
              const next = encodeAt(dim, q);
              if (!next) break;
              best = next;
            }
            while (dataUrlByteSize(best) > targetMaxBytes && dim > minDimension) {
              dim = Math.max(minDimension, Math.round(dim * 0.8));
              const next = encodeAt(dim, q);
              if (!next) break;
              best = next;
            }
          }

          // Only return the compressed version if it's actually smaller.
          resolve(best.length < original.length ? best : original);
        } catch {
          resolve(original);
        }
      };
      img.onerror = () => resolve(original);
      img.src = original;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Approximate byte size of a base64 data URL (used to detect oversized images
 * before attempting to persist them).
 */
export function dataUrlByteSize(dataUrl: string): number {
  const i = dataUrl.indexOf(',');
  if (i < 0) return dataUrl.length;
  const b64 = dataUrl.slice(i + 1);
  return Math.floor(b64.length * 0.75);
}
