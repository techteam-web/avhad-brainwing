import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
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

export function OrbitStage({ orbit, active = true }) {
  const canvas = useRef(null);
  const state = useRef({ frame: 0, velocity: 0, dragging: false, loaded: new Set() });
  const [ready, setReady] = useState(0); // 0..1, how much of the orbit has arrived
  const [prompt, setPrompt] = useState(false);

  // The orbit stays mounted behind the stills so switching back does not reload 96
  // frames — but while it is behind them it must not answer the wheel or the keyboard.
  const live = useRef(active);
  useEffect(() => {
    live.current = active;
  }, [active]);

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

    // The prompt appears when nothing has been touched for a while, and leaves the moment
    // it is.
    let idleTimer = setTimeout(() => alive && live.current && setPrompt(true), 2200);
    // Asked once. The moment the orbit is turned the prompt is done for good — repeating
    // it at someone who already knows how it works is nagging, not guidance.
    const touched = () => {
      setPrompt(false);
      clearTimeout(idleTimer);
    };

    const sizeCanvas = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      el.width = Math.round(innerWidth * dpr);
      el.height = Math.round(innerHeight * dpr);
      el.style.width = `${innerWidth}px`;
      el.style.height = `${innerHeight}px`;
      draw();
    };

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
      const img = elements.get(i);
      if (!img) return;
      const { W, H, left, top } = coverRect(el.width, el.height, img.naturalWidth / img.naturalHeight);
      ctx.drawImage(img, left, top, W, H);
    };

    // preload() hands back a promise; keep the decoded element beside it for drawing.
    const elements = new Map();
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
          raf = 0;
          return;
        }
      }
      // Hitting either end stops the throw rather than bouncing or wrapping.
      const held = clamp(s.frame);
      if (held !== s.frame) s.velocity = 0;
      s.frame = held;
      draw();
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
      touched();
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
    // A mouse wheel turns the orbit too, feeding the same momentum, and bound to the
    // window because the pointer is often over the date rail or the header.
    const onWheel = (e) => {
      if (!live.current) return;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      s.velocity = Math.max(-4, Math.min(4, s.velocity + d * 0.01));
      touched();
      kick();
    };
    const onKey = (e) => {
      if (!live.current || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      s.frame = clamp(s.frame + (e.key === 'ArrowRight' ? 1 : -1));
      touched();
      kick();
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    addEventListener('wheel', onWheel, { passive: true });
    addEventListener('keydown', onKey);
    addEventListener('resize', sizeCanvas);
    sizeCanvas();
    kick();

    return () => {
      alive = false;
      clearTimeout(idleTimer);
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      removeEventListener('wheel', onWheel);
      removeEventListener('keydown', onKey);
      removeEventListener('resize', sizeCanvas);
    };
  }, [orbit]);

  return (
    <>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full cursor-grab touch-none" style={{ backgroundImage: `url(${orbit.lqip})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />

      {ready < 0.999 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 text-center">
          <p className="label-micro text-bone/70 [text-shadow:0_1px_10px_rgba(16,21,43,.9)]">Loading orbit · {Math.round(ready * 100)}%</p>
        </div>
      )}

      {/* gated on `active` here rather than reset in an effect: while the stills are up,
          the prompt simply is not rendered */}
      <DragPrompt show={active && prompt && ready > 0.1} />
    </>
  );
}

// Shown when the orbit has been sitting untouched. A wash breathes up out of the
// photograph so the mark reads against it, a hand travels left to right, and both fade
// away — then it waits and asks again.
function DragPrompt({ show }) {
  const wash = useRef(null);
  const hand = useRef(null);
  const copy = useRef(null);

  useEffect(() => {
    if (!show) return undefined;
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 4.5 });
    tl.fromTo(wash.current, { opacity: 0 }, { opacity: 1, duration: 1.3, ease: 'sine.inOut' })
      .fromTo(copy.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out' }, '<0.2')
      .fromTo(hand.current, { x: -90, opacity: 0 }, { x: -90, opacity: 1, duration: 0.5, ease: 'power2.out' }, '<')
      .to(hand.current, { x: 90, duration: 2.1, ease: 'power2.inOut' })
      .to(hand.current, { opacity: 0, duration: 0.5, ease: 'power2.in' })
      .to([wash.current, copy.current], { opacity: 0, duration: 1, ease: 'sine.inOut' }, '<0.1');
    return () => tl.kill();
  }, [show]);

  if (!show) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div
        ref={wash}
        className="absolute inset-0 opacity-0"
        style={{ background: 'radial-gradient(75% 60% at 50% 55%, rgba(16,21,43,.62) 0%, rgba(16,21,43,.3) 45%, rgba(16,21,43,0) 78%)' }}
      />

      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
        <div className="relative mx-auto h-14 w-65 md:w-80">
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 rule-bone" />
          <span ref={hand} className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-4">
            <svg viewBox="0 0 24 24" className="size-3.5 text-bone/50" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 5 8 12l7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {/* the hand itself — a grab mark, not a system cursor */}
            <span className="grid size-12 place-items-center rounded-full border border-bone/70 bg-ink/35">
              <svg viewBox="0 0 24 24" className="size-6 text-bone" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path
                  d="M9 11V6.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V12m0-1a1.5 1.5 0 0 1 3 0v4.5a5.5 5.5 0 0 1-5.5 5.5h-1A5.5 5.5 0 0 1 6 15.5V13a1.5 1.5 0 0 1 3 0"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <svg viewBox="0 0 24 24" className="size-3.5 text-bone/50" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>

        <p ref={copy} className="label-micro mt-7 text-center text-bone/85 opacity-0">Drag or scroll to turn the orbit</p>
      </div>
    </div>
  );
}
