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

// Framing a photograph on its plot. `plot` is the plot's box as fractions of the
// photograph — left, top, right, bottom — and `clear` is how far in from each edge of the
// screen the controls reach, in px: the plot belongs in what is left.
//
// How much of the way from covering the screen down to just containing the photograph it
// has to shrink for the whole plot to fit in the clear part: 1 when covering already does.
export function fillFor(vw, vh, ratio, plot, clear) {
  if (!plot) return 1;
  const cover = Math.max(vw, vh * ratio);
  const contain = Math.min(vw, vh * ratio);
  const [x0, y0, x1, y1] = plot;
  const fit = Math.min((vw - clear.left - clear.right) / (x1 - x0), ((vh - clear.top - clear.bottom) * ratio) / (y1 - y0));
  return Math.min(cover, Math.max(contain, fit)) / cover;
}

// The photograph's box on screen at that fill, its plot on the middle of the clear part —
// but never with an edge of the photograph dragged inside the screen where it is bigger
// than the screen, nor off it where it is smaller.
export function frameOn(vw, vh, ratio, plot, clear, fill = 1) {
  const width = Math.max(vw, vh * ratio) * fill;
  const height = width / ratio;
  const [x0, y0, x1, y1] = plot ?? [0.5, 0.5, 0.5, 0.5];
  const hold = (v, size, room) => (size >= room ? Math.min(0, Math.max(room - size, v)) : Math.max(0, Math.min(room - size, v)));
  const left = (clear.left + vw - clear.right) / 2 - ((x0 + x1) / 2) * width;
  const top = (clear.top + vh - clear.bottom) / 2 - ((y0 + y1) / 2) * height;
  return { left: hold(left, width, vw), top: hold(top, height, vh), width, height };
}
