import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { coverRect, preload, srcAt, widthFor } from '../lib/images';

// The orbit, scrubbed by hand. The frames are drawn into a canvas rather than swapped as
// <img> sources: one element, no layout, no flicker, and the drawn frame can be held while
// the next one decodes.
//
// Every frame the drone shot is on the server — thousands per turn — so they are never all
// held at once. Two layers do the work:
//
//   spine   a coarse pass over the whole turn at the small width, loaded up front and kept.
//           It is the floor: any frame not loaded yet falls back to the nearest spine frame,
//           so a drag never shows a hole.
//   window  the frames either side of the hand, at full width, fetched as it moves and
//           dropped again once it has gone past, under a fixed memory budget.
//
// While the hand is moving the picture comes from the spine alone — one size, evenly
// spaced, never ahead of the hand — and it sharpens to the full-width frame the moment the
// hand settles. Drawing whichever frame happened to be loaded, from either layer and
// either side, is what made a fast drag pulse and jump.

const WIDTHS = [640, 1280];
const SENSITIVITY = 1; // one drag across the full screen width = one full turn
const SPINE = 96; // frames of the turn held permanently as the fallback layer
const SPINE_WIDTH = 640;
const WINDOW = 60; // full-width frames kept either side of the hand
const BUDGET = 260e6; // bytes of decoded full-width frames held at once
const FETCHES = 6; // frame requests in flight
const SETTLE = 1.2; // frames a tick below which the hand counts as still, and the picture sharpens
const LOOK = 8; // ticks ahead to aim requests, so a frame arrives before the hand reaches it
const BEHIND = 6; // full-width frames behind the hand that may stand in for it

export function OrbitStage({ orbit, active = true }) {
  const canvas = useRef(null);
  // ?frames on the address puts the frame number under the cursor, for choosing arcs
  const readout = useRef(null);
  const numbered = typeof location !== 'undefined' && new URLSearchParams(location.search).has('frames');
  const state = useRef({ frame: 0, velocity: 0, speed: 0, dragging: false });
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
    const width = widthFor(innerWidth, WIDTHS);
    const digits = orbit.digits ?? 3;
    // What is actually shown: the chosen arcs laid end to end, or the whole turn when none
    // are set. Everything below counts in places along this list, and only the URL and the
    // readout speak in the capture's own frame numbers.
    const arcs = orbit.arcs?.length ? orbit.arcs : [[0, orbit.frames - 1]];
    const shown = [];
    for (const [a, b] of arcs) for (let f = Math.max(0, a); f <= Math.min(b, orbit.frames - 1); f++) shown.push(f);
    const total = shown.length;
    // Wheel and arrow keys move by a share of the turn, not by one frame: at thousands of
    // frames a turn, a single frame is a fraction of a degree.
    const coarse = Math.max(1, Math.round(total / 96));
    // The orbit has a first and a last frame; it does not wrap around.
    const clamp = (v) => Math.min(Math.max(v, 0), total - 1);
    const url = (i, w) => srcAt({ src: `${orbit.src}/${String(shown[clamp(i)]).padStart(digits, '0')}` }, w);
    const spineStep = Math.max(1, Math.floor(total / SPINE));
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

    const spine = new Map(); // index -> small frame, kept for the life of the orbit
    const detail = new Map(); // index -> full-width frame, least recently drawn evicted first
    const inflight = new Map();
    let held = 0; // decoded bytes in `detail`
    let drawn = null; // whatever was last painted, so a gap never blanks the canvas

    // On the hand or behind it, never in front: a substitute from ahead sends the picture
    // the opposite way to the hand for a moment, which is what reads as a glitch.
    const sharp = (i) => {
      for (let d = 0; d <= BEHIND; d++) {
        const img = detail.get(i - d);
        if (img) {
          // drawing it marks it as recently used, so the hand's own frames are the last to go
          detail.delete(i - d);
          detail.set(i - d, img);
          return img;
        }
      }
      return null;
    };

    // The spine, on its own grid and always at or behind the hand, so the frames it gives
    // out climb and fall with the drag instead of stepping about.
    const spineAt = (i) => {
      for (let g = Math.floor(i / spineStep) * spineStep; g >= 0; g -= spineStep) {
        const img = spine.get(g);
        if (img) return img;
      }
      return null;
    };

    const draw = () => {
      const i = clamp(Math.round(s.frame));
      const img = (s.speed <= SETTLE ? sharp(i) : null) ?? spineAt(i) ?? drawn;
      if (!img) return;
      drawn = img;
      const { W, H, left, top } = coverRect(el.width, el.height, img.naturalWidth / img.naturalHeight);
      ctx.drawImage(img, left, top, W, H);
      if (readout.current) readout.current.textContent = `frame ${shown[i]}`;
    };

    const evict = () => {
      const here = clamp(Math.round(s.frame));
      for (const [i, img] of detail) {
        if (held <= BUDGET) break;
        if (Math.abs(i - here) <= 4) continue; // never drop what is on screen
        held -= img.naturalWidth * img.naturalHeight * 4;
        detail.delete(i);
      }
    };

    // Frames are asked for from where the hand is about to be, outwards, leaning the way it
    // is travelling.
    const pump = () => {
      const now = clamp(Math.round(s.frame));
      const here = clamp(Math.round(s.frame + s.velocity * LOOK));
      const lead = s.velocity > 0.5 ? 1 : s.velocity < -0.5 ? -1 : 0;
      for (const i of inflight.keys()) {
        // Outrun. A request cannot truly be called back — setting src to '' fires a fresh
        // one at the page itself — so it is simply disowned: it stops counting against the
        // six in flight and its frame is dropped rather than kept when it lands.
        if (Math.abs(i - now) > WINDOW * 2) inflight.delete(i);
      }
      // Mid-drag the spine is what is on screen, so the full-width frames worth fetching are
      // the few around where the throw will come to rest, not sixty either side of a hand
      // that is about to be somewhere else.
      const reach = s.speed > SETTLE ? 10 : WINDOW;
      for (let d = 0; d <= reach && inflight.size < FETCHES; d++) {
        for (const dir of d === 0 ? [0] : lead ? [lead, -lead] : [1, -1]) {
          const i = clamp(here + d * dir);
          if (detail.has(i) || inflight.has(i)) continue;
          const img = new Image();
          img.decoding = 'async';
          img.src = url(i, width);
          inflight.set(i, img);
          img
            .decode()
            .then(() => {
              if (!alive || !inflight.has(i)) return; // disowned while it was in the air
              detail.set(i, img);
              held += img.naturalWidth * img.naturalHeight * 4;
              evict();
              // only worth repainting for if the hand is settled on it — mid-drag the
              // spine is what is being drawn
              if (s.speed <= SETTLE && clamp(Math.round(s.frame)) - i >= 0 && clamp(Math.round(s.frame)) - i <= BEHIND) draw();
            })
            .catch(() => {})
            .finally(() => inflight.delete(i));
          if (inflight.size >= FETCHES) break;
        }
      }
    };

    // The spine first: the whole turn, coarsely, so it is draggable end to end at once.
    (async () => {
      for (let i = 0; i < total; i += spineStep) {
        if (!alive) return;
        const img = await preload(url(i, SPINE_WIDTH));
        if (!alive) return;
        spine.set(i, img);
        setReady(Math.min(1, (spine.size * spineStep) / total));
        if (spine.size < 3 || clamp(Math.round(s.frame)) - i < spineStep) draw();
      }
      pump();
    })();

    // ---------------------------------------------------------------- interaction
    const step = () => {
      const was = s.frame;
      if (!s.dragging) {
        // Nothing moves on its own: the orbit sits still until it is dragged, and after a
        // release it only carries the throw's momentum before settling on a frame.
        if (Math.abs(s.velocity) > 0.02) {
          s.frame += s.velocity;
          s.velocity *= 0.85;
        } else {
          s.velocity = 0;
          s.speed = 0; // come to rest, and the full-width frame takes over
          s.frame = clamp(Math.round(s.frame));
          draw();
          pump();
          raf = 0;
          return;
        }
      }
      // Hitting either end stops the throw rather than bouncing or wrapping.
      const at = clamp(s.frame);
      if (at !== s.frame) s.velocity = 0;
      s.frame = at;
      // how fast the hand is actually travelling, smoothed, in frames a tick
      s.speed = s.speed * 0.55 + Math.abs(s.frame - was) * 0.45;
      draw();
      pump();
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
      s.velocity = Math.max(-4 * coarse, Math.min(4 * coarse, s.velocity + d * 0.01 * coarse));
      touched();
      kick();
    };
    const onKey = (e) => {
      if (!live.current || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      // a plain arrow nudges the turn; with Shift it steps one single frame
      const stepBy = e.shiftKey ? 1 : coarse;
      s.frame = clamp(s.frame + (e.key === 'ArrowRight' ? stepBy : -stepBy));
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
      for (const img of inflight.values()) img.src = '';
      inflight.clear();
      detail.clear();
      spine.clear();
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

      {numbered && (
        <p ref={readout} className="panel label-micro pointer-events-none absolute bottom-8 left-1/2 z-30 -translate-x-1/2 rounded-full px-5 py-2.5 text-brass-lit">
          frame —
        </p>
      )}

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
