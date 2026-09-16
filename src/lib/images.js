// Every image ships as a small ladder of widths; these pick a rung and pre-decode it.
export const srcAt = (item, w) => `${item.src}-${w}.webp`;

export function widthFor(cssWidth, widths) {
  const need = cssWidth * Math.min(window.devicePixelRatio || 1, 2);
  return widths.find((w) => w >= need) ?? widths[widths.length - 1];
}

// An <img> that decodes mid-animation drops frames, so anything about to be shown is
// decoded first. The promise cache also stops the same frame being fetched twice.
const cache = new Map();
export function preload(url) {
  if (!cache.has(url)) {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    cache.set(
      url,
      img.decode().then(() => img, () => img),
    );
  }
  return cache.get(url);
}

export const cached = (url) => cache.get(url);

// object-fit: cover, as numbers — needed when drawing into a canvas.
export function coverRect(vw, vh, ratio) {
  const W = Math.max(vw, vh * ratio);
  const H = W / ratio;
  return { W, H, left: (vw - W) / 2, top: (vh - H) / 2 };
}
