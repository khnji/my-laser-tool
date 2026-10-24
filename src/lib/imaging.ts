/** Client-side background removal: region-growing flood fill on RGB colors. */

export async function loadImageFromBlob(blob: Blob, maxDim = 1400): Promise<ImageData> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no canvas ctx");
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function flood(img: ImageData, mask: Uint8Array, seed: number, limit: number): number {
  const { width: w, height: h, data } = img;
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const so = seed * 4;
  const sr = data[so];
  const sg = data[so + 1];
  const sb = data[so + 2];
  mask[seed] = 1;
  queue[tail++] = seed;
  let count = 1;

  const tryPush = (n: number) => {
    if (mask[n]) return;
    const o = n * 4;
    const dr = data[o] - sr;
    const dg = data[o + 1] - sg;
    const db = data[o + 2] - sb;
    if (dr * dr + dg * dg + db * db <= limit) {
      mask[n] = 1;
      queue[tail++] = n;
      count++;
    }
  };

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) tryPush(idx - 1);
    if (x < w - 1) tryPush(idx + 1);
    if (y > 0) tryPush(idx - w);
    if (y < h - 1) tryPush(idx + w);
  }
  return count;
}

/** Grow a removal region from a clicked pixel (magic wand). */
export function wandRemoveAt(img: ImageData, mask: Uint8Array, x: number, y: number, tolerance: number): void {
  const limit = tolerance * tolerance * 3;
  flood(img, mask, y * img.width + x, limit);
}

/** Remove every pixel in the image similar to the clicked color (non-contiguous). */
export function removeSimilarGlobal(img: ImageData, mask: Uint8Array, x: number, y: number, tolerance: number): void {
  const { width: w, height: h, data } = img;
  const limit = tolerance * tolerance * 3;
  const o = (y * w + x) * 4;
  const sr = data[o];
  const sg = data[o + 1];
  const sb = data[o + 2];
  for (let i = 0; i < w * h; i++) {
    if (mask[i]) continue;
    const p = i * 4;
    const dr = data[p] - sr;
    const dg = data[p + 1] - sg;
    const db = data[p + 2] - sb;
    if (dr * dr + dg * dg + db * db <= limit) mask[i] = 1;
  }
}

/**
 * Automatic mode: start a region grow from every un-removed border pixel.
 * Works best when the background touches the edges of the photo.
 */
export function autoRemoveEdges(img: ImageData, mask: Uint8Array, tolerance: number): void {
  const { width: w, height: h } = img;
  const limit = tolerance * tolerance * 3;
  for (let x = 0; x < w; x++) {
    if (!mask[x]) flood(img, mask, x, limit);
    const b = (h - 1) * w + x;
    if (!mask[b]) flood(img, mask, b, limit);
  }
  for (let y = 0; y < h; y++) {
    const l = y * w;
    if (!mask[l]) flood(img, mask, l, limit);
    const r = l + w - 1;
    if (!mask[r]) flood(img, mask, r, limit);
  }
}

/** Composite: copy of original with masked pixels made transparent (+ 1px feather). */
export function compositeWithMask(img: ImageData, mask: Uint8Array | null, smooth: boolean): ImageData {
  const { width: w, height: h, data } = img;
  const out = new ImageData(new Uint8ClampedArray(data), w, h);
  if (!mask) return out;
  const d = out.data;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    let alpha = 0;
    if (smooth) {
      const x = i % w;
      const y = (i - x) / w;
      outer: for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (!mask[ny * w + nx]) {
            alpha = 115;
            break outer;
          }
        }
      }
    }
    d[i * 4 + 3] = alpha;
  }
  return out;
}
