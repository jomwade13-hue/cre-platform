/**
 * Image utilities for client-side compression before persisting to localStorage.
 *
 * localStorage has a ~5 MB quota per origin. A single full-resolution photo
 * (4–10 MB as a JPEG, 15+ MB as a base64 data URL) blows that quota. We
 * downscale and re-encode every uploaded image so we can store many of them.
 */

export interface CompressOptions {
  maxDimension?: number; // longest edge in px (default 1600)
  quality?: number;      // JPEG quality 0..1 (default 0.82)
  mimeType?: string;     // output mime (default 'image/jpeg')
}

/**
 * Reads a File, decodes it, downscales (if larger than `maxDimension` on
 * the longest edge), and returns a base64 data URL of the compressed JPEG.
 *
 * Falls back to the original FileReader result if anything goes wrong.
 */
export async function compressImageFile(file: File, opts: CompressOptions = {}): Promise<string> {
  const { maxDimension = 1600, quality = 0.82, mimeType = 'image/jpeg' } = opts;

  // PNG with transparency? Keep PNG to preserve alpha (logos etc.).
  const wantPng = (file.type === 'image/png' && mimeType === 'image/jpeg') ? false : false;
  const outputMime = wantPng ? 'image/png' : mimeType;

  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const original = reader.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const { width: w0, height: h0 } = img;
          const longest = Math.max(w0, h0);
          const scale = longest > maxDimension ? maxDimension / longest : 1;
          const w = Math.round(w0 * scale);
          const h = Math.round(h0 * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(original); return; }
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL(outputMime, quality);
          // Only use compressed version if it's actually smaller
          resolve(compressed.length < original.length ? compressed : original);
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
