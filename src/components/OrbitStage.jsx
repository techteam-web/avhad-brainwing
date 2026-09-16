import { useEffect, useRef, useState } from 'react';
import { coverRect, preload, srcAt, widthFor } from '../lib/images';

// The orbit, scrubbed by hand. The frames are drawn into a canvas rather than swapped as
// <img> sources: one element, no layout, no flicker, and the drawn frame can be held while
// the next one decodes.
//
// Loading is coarse-to-fine — every eighth frame first, so the orbit can be dragged within
// a second, then the gaps fill in. Anything not yet loaded falls back to the nearest frame
// that is, so a drag never shows a hole.

const WIDTHS = [640, 1280];
const SENSITIVITY = 1; // one drag across the full screen width = one full turn

export function OrbitStage({ orbit, onAngle }) {
  const canvas = useRef(null);
  const state = useRef({ frame: 0, velocity: 0, dragging: false, loaded: new Set() });
  const [ready, setReady] = useState(0); // 0..1, how much of the orbit has arrived
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el.getContext('2d', { alpha: false });
    const s = state.current;
    const total = orbit.frames;
    const width = widthFor(innerWidth, WIDTHS);
    // The orbit has a first and a last frame; it does not wrap around.
    const clamp = (v) => Math.min(Math.max(v, 0), total - 1);
    const url = (i) => srcAt({ src: `${orbit.src}/${String(clamp(i)).padStart(3, '0')}` }, width);
    let alive = true;
    let raf = 0;
    let dpr = 1;

    const sizeCanvas = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      el.width = Math.round(innerWidth * dpr);
      el.height = Math.round(innerHeight * dpr);
      el.style.width = `${innerWidth}px`;
      el.style.height = `${innerHeight}px`;
      draw();
    };

    // The nearest loaded frame, so there is always something to show.
    const nearest = (i) => {
      for (let d = 0; d < total; d++) {
        if (i - d >= 0 && s.loaded.has(i - d)) return i - d;
        if (i + d < total && s.loaded.has(i + d)) return i + d;
      }
      return -1;
    };

    const draw = () => {
      const i = nearest(clamp(Math.round(s.frame)));
      if (i < 0) return;
      const img = imgOf(i);
      if (!img) return;
      const { W, H, left, top } = coverRect(el.width, el.height, img.naturalWidth / img.naturalHeight);
      ctx.drawImage(img, left, top, W, H);
    };

    // preload() hands back a promise; keep the decoded element beside it for drawing.
    const elements = new Map();
    const imgOf = (i) => elements.get(i);
    const load = async (i) => {
      const k = clamp(i);
      if (elements.has(k)) return;
      elements.set(k, null);
      const img = await preload(url(k));
      if (!alive) return;
      elements.set(k, img);
      s.loaded.add(k);
      setReady(s.loaded.size / total);
      if (clamp(Math.round(s.frame)) === k || s.loaded.size < 3) draw();
    };

    (async () => {
      for (let i = 0; i < total; i += 8) await load(i); // coarse pass: draggable almost at once
      for (let i = 0; i < total; i++) if (alive) await load(i);
    })();

    // ---------------------------------------------------------------- interaction
    const step = () => {
      if (!s.dragging) {
        // Nothing moves on its own: the orbit sits still until it is dragged, and after a
        // release it only carries the throw's momentum before settling on a frame.
        if (Math.abs(s.velocity) > 0.02) {
          s.frame += s.velocity;
          s.velocity *= 0.85;
        } else {
          s.velocity = 0;
          s.frame = clamp(Math.round(s.frame));
          draw();
          onAngle?.(clamp(Math.round(s.frame)), total);
          raf = 0;
          return;
        }
      }
      // Hitting either end stops the throw rather than bouncing or wrapping.
      const held = clamp(s.frame);
      if (held !== s.frame) s.velocity = 0;
      s.frame = held;
      draw();
      onAngle?.(Math.round(s.frame), total);
      raf = requestAnimationFrame(step);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };

    let last = 0;
    const onDown = (e) => {
      s.dragging = true;
      s.velocity = 0;
      last = e.clientX;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
      setHint(false);
      kick();
    };
    const onMove = (e) => {
      if (!s.dragging) return;
      const perFrame = (innerWidth * SENSITIVITY) / total;
      const d = (e.clientX - last) / perFrame;
      last = e.clientX;
      s.frame = clamp(s.frame + d); // drag right to go on round; at the start, left does nothing
      // Only a light glide after release: the drag itself should stay one-to-one with the
      // hand, so a screen-width drag really is one turn.
      s.velocity = d * 0.4;
    };
    const onUp = (e) => {
      if (!s.dragging) return;
      s.dragging = false;
      el.releasePointerCapture?.(e.pointerId);
      el.style.cursor = 'grab';
      kick();
    };
    const onWheel = (e) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      s.frame = clamp(s.frame + d * 0.03);
      s.velocity = 0;
      setHint(false);
      kick();
    };
    const onKey = (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      s.frame = clamp(s.frame + (e.key === 'ArrowRight' ? 1 : -1));
      setHint(false);
      kick();
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: true });
    addEventListener('keydown', onKey);
    addEventListener('resize', sizeCanvas);
    sizeCanvas();
    kick();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      removeEventListener('keydown', onKey);
      removeEventListener('resize', sizeCanvas);
    };
  }, [orbit, onAngle]);

  // Dragging the scrub bar drives the same frame counter.
  const scrub = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    state.current.frame = t * (orbit.frames - 1);
    state.current.velocity = 0;
    setHint(false);
  };

  return (
    <>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full cursor-grab touch-none" style={{ backgroundImage: `url(${orbit.lqip})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />

      {ready < 0.999 && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <p className="label rounded-full bg-navy/70 px-4 py-2 text-paper backdrop-blur-sm">Loading orbit · {Math.round(ready * 100)}%</p>
        </div>
      )}

      <div
        className="absolute inset-x-0 bottom-0 z-20 cursor-ew-resize px-5 pb-6 pt-10 md:px-10 md:pb-8"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          scrub(e);
        }}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture?.(e.pointerId) && scrub(e)}
      >
        <ScrubBar frames={orbit.frames} state={state} />
        {hint && (
          <p className="label mt-3 text-center text-paper/80 drop-shadow-[0_1px_8px_rgba(18,21,31,.7)]">
            <span className="animate-pulse">Drag right to orbit the site</span>
          </p>
        )}
      </div>
    </>
  );
}

// Reads the frame counter straight off the shared ref each frame, so the bar never causes
// a React render while the orbit is moving.
function ScrubBar({ frames, state }) {
  const fill = useRef(null);
  const knob = useRef(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = (Math.min(Math.max(state.current.frame, 0), frames - 1) / (frames - 1)) * 100;
      if (fill.current) fill.current.style.width = `${t}%`;
      if (knob.current) knob.current.style.left = `${t}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frames, state]);

  return (
    <div className="relative h-px w-full bg-paper/35">
      <div ref={fill} className="absolute inset-y-0 left-0 bg-paper" />
      <span ref={knob} className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper shadow-[0_0_0_4px_rgba(27,34,78,.35)]" />
    </div>
  );
}
