import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import gsap from 'gsap';
import { OrbitStage } from '../components/OrbitStage';
import { VIEWS, getProject, longDate, monthOf, yearOf, viewsOf } from '../data/projects';
import { srcAt, widthFor } from '../lib/images';
import logo from '../assets/avhad-logo.svg';

const STILL_WIDTHS = [640, 1280, 1920];

export function Project() {
  const { slug } = useParams();
  const project = getProject(slug);
  if (!project) return <Navigate to="/" replace />;
  return <ProjectView key={slug} project={project} />;
}

function ProjectView({ project }) {
  const shot = project.captures.filter((c) => !c.upcoming);
  const [date, setDate] = useState(shot.at(-1)?.date ?? project.captures[0].date);
  const [mode, setMode] = useState('orbit');
  const [view, setView] = useState('top');
  const [open, setOpen] = useState(null); // index into the current view's photos

  const capture = project.captures.find((c) => c.date === date) ?? project.captures[0];
  const views = useMemo(() => viewsOf(capture), [capture]);
  // Keep the chosen view if this date has it, otherwise fall back to its first one.
  const activeView = views.some((v) => v.key === view) ? view : views[0]?.key;
  const photos = views.find((v) => v.key === activeView)?.photos ?? [];

  const orbit = capture.orbit;
  const showOrbit = mode === 'orbit' && !!orbit;

  return (
    <main className="relative h-dvh w-full overflow-clip bg-navy text-paper">
      {showOrbit ? <OrbitStage orbit={orbit} /> : <Views photos={photos} onOpen={setOpen} dark={mode === 'orbit'} />}

      {mode === 'orbit' && !orbit && (
        <div className="absolute inset-0 grid place-items-center px-6">
          <div className="max-w-sm text-center">
            <p className="label text-paper/60">{longDate(capture.date)}</p>
            <h2 className="mt-2 text-hero font-semibold leading-tight">Orbit arriving with the next capture</h2>
            <p className="mt-2 text-label text-paper/70">The stills from this visit are ready now.</p>
            <button type="button" onClick={() => setMode('views')} className="label mt-5 rounded-full bg-paper px-5 py-2.5 text-navy transition hover:bg-paper/85">
              Browse views
            </button>
          </div>
        </div>
      )}

      {/* header */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-4 p-4 md:p-6 3xl:p-8">
        <div className="flex items-center gap-3">
          <Link to="/" className="pointer-events-auto grid size-10 place-items-center rounded-full bg-paper/95 text-navy transition hover:bg-paper md:size-11" aria-label="All projects">
            ←
          </Link>
          <span className="pointer-events-auto rounded-full bg-paper/95 px-3 py-2">
            <img src={logo} alt="Avhad" className="h-4 w-auto md:h-5" />
          </span>
        </div>

        <div className="text-right">
          <h1 className="text-title font-semibold leading-none tracking-tight drop-shadow-[0_1px_10px_rgba(18,21,31,.55)]">{project.name}</h1>
          <p className="label mt-1 text-paper/70">{project.place}</p>
        </div>
      </header>

      {/* orbit / views switch */}
      {/* on a phone this sits below the header rather than colliding with the name */}
      <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 md:top-6">
        <div className="flex gap-1 rounded-full bg-navy/55 p-1 ring-1 ring-paper/25 backdrop-blur-md">
          {[['orbit', 'Orbit'], ['views', 'Views']].map(([key, text]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`label rounded-full px-4 py-2 transition ${mode === key ? 'bg-paper text-navy' : 'text-paper/75 hover:text-paper'}`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      {/* view categories */}
      {mode === 'views' && (
        <div className="absolute inset-x-0 top-33 z-30 flex justify-center px-4 md:top-20">
          <div className="flex max-w-full gap-1 overflow-hidden rounded-full bg-navy/45 p-1 ring-1 ring-paper/20 backdrop-blur-md">
            {VIEWS.map((v) => {
              const has = views.some((x) => x.key === v.key);
              return (
                <button
                  key={v.key}
                  type="button"
                  disabled={!has}
                  onClick={() => setView(v.key)}
                  className={`label rounded-full px-3.5 py-2 transition md:px-4 ${
                    view === v.key ? 'bg-paper text-navy' : has ? 'text-paper/75 hover:text-paper' : 'text-paper/30'
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Timeline captures={project.captures} date={date} onPick={setDate} />

      {open !== null && <Viewer photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </main>
  );
}

// The dates of this project, newest at the bottom: a rail on the right on wide screens,
// a row under the header on phones. Quarters not yet flown sit on it as hollow marks.
function Timeline({ captures, date, onPick }) {
  return (
    <nav className="absolute z-30 max-md:inset-x-0 max-md:bottom-20 max-md:flex max-md:justify-center md:right-6 md:top-1/2 md:-translate-y-1/2 3xl:right-10">
      {/* a pill, like the other controls — it keeps the dates legible over a bright frame
          without a gradient creeping in around the edge of the page */}
      <ul className="flex gap-2 rounded-full bg-navy/50 px-3 py-2 ring-1 ring-paper/20 backdrop-blur-md md:flex-col md:items-end md:gap-4 md:rounded-2xl md:px-4 md:py-4">
        {captures.map((c) => {
          const active = c.date === date;
          return (
            <li key={c.date}>
              <button
                type="button"
                disabled={c.upcoming}
                onClick={() => onPick(c.date)}
                className={`group flex items-center gap-3 transition ${c.upcoming ? 'cursor-default' : ''}`}
              >
                <span
                  className={`label text-right leading-none transition max-md:hidden ${
                    active ? 'text-paper' : c.upcoming ? 'text-paper/50' : 'text-paper/75 group-hover:text-paper'
                  }`}
                >
                  {monthOf(c.date)} <span className="opacity-60">{yearOf(c.date).slice(2)}</span>
                </span>
                <span className={`relative grid place-items-center transition ${active ? 'size-3.5' : 'size-2.5'}`}>
                  <span
                    className={`size-full rounded-full transition ${
                      active ? 'bg-brass ring-4 ring-brass/25' : c.upcoming ? 'border border-dashed border-paper/50' : 'bg-paper/70 group-hover:bg-paper'
                    }`}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="label absolute right-1 top-full mt-2.5 hidden whitespace-nowrap text-paper/60 [text-shadow:0_1px_8px_rgba(18,21,31,.85)] md:block">Capture date</p>
    </nav>
  );
}

// One view's photographs, side by side. Drag left and right; no vertical scroll anywhere.
function Views({ photos, onOpen }) {
  const track = useRef(null);
  const state = useRef({ x: 0, target: 0, dragging: false, last: 0, velocity: 0 });

  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const s = state.current;
    s.x = s.target = 0;
    el.style.transform = 'translate3d(0px,0,0)';
    gsap.fromTo(el.children, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.06, ease: 'expo.out' });
  }, [photos]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const s = state.current;
    let raf = 0;
    const limit = () => Math.min(0, el.parentElement.clientWidth - el.scrollWidth);

    const tick = () => {
      s.target = Math.min(0, Math.max(limit(), s.target));
      s.x += (s.target - s.x) * 0.14;
      el.style.transform = `translate3d(${s.x}px,0,0)`;
      raf = Math.abs(s.target - s.x) > 0.3 || s.dragging ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onDown = (e) => {
      s.dragging = true;
      s.moved = 0;
      s.last = e.clientX;
      kick();
    };
    const onMove = (e) => {
      if (!s.dragging) return;
      const dx = e.clientX - s.last;
      s.moved += Math.abs(dx);
      // Capture only once this is really a drag; capturing on press would swallow the
      // click and a tap would never reach the photograph underneath.
      if (s.moved > 6 && !el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId);
      s.target += dx;
      s.last = e.clientX;
    };
    const onUp = (e) => {
      s.dragging = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      kick();
    };
    const onWheel = (e) => {
      s.target -= Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      kick();
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [photos]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-navy">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 cursor-grab touch-none active:cursor-grabbing">
        {/* the right padding keeps the last photograph clear of the date rail */}
        <div ref={track} className="flex w-max items-center gap-4 px-5 md:gap-6 md:pl-10 md:pr-40 3xl:pr-52">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(i)}
              className="group relative h-[46vh] shrink-0 overflow-hidden rounded-xl bg-navy-2 ring-1 ring-paper/15 md:h-[56vh]"
              style={{ aspectRatio: `${p.width} / ${p.height}`, backgroundImage: `url(${p.lqip})`, backgroundSize: 'cover' }}
            >
              <img src={srcAt(p, 1280)} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
              <span className="label absolute bottom-3 left-3 rounded-full bg-navy/70 px-2.5 py-1 text-paper/90 backdrop-blur-sm">
                {String(i + 1).padStart(2, '0')} · {p.time?.slice(0, 5)}
              </span>
            </button>
          ))}
        </div>
      </div>
      <p className="label pointer-events-none absolute inset-x-0 bottom-8 text-center text-paper/65 [text-shadow:0_1px_8px_rgba(18,21,31,.8)]">Drag to browse · tap to enlarge</p>
    </div>
  );
}

function Viewer({ photos, index, onIndex, onClose }) {
  const photo = photos[index];
  const step = (d) => onIndex((index + d + photos.length) % photos.length);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  useLayoutEffect(() => {
    gsap.fromTo('.js-viewer', { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
  }, []);

  const contain = Math.min(innerWidth, innerHeight * 0.78 * (photo.width / photo.height));

  return (
    <div className="js-viewer absolute inset-0 z-50 flex flex-col bg-navy/97 backdrop-blur-sm">
      <div className="flex items-center justify-between p-4 md:p-6">
        <p className="label text-paper/70">
          {String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
        </p>
        <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full ring-1 ring-paper/30 transition hover:bg-paper hover:text-navy">
          ✕
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 md:px-20">
        <img key={photo.id} src={srcAt(photo, widthFor(contain, STILL_WIDTHS))} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        {photos.length > 1 &&
          [['←', -1, 'left-2 md:left-6'], ['→', 1, 'right-2 md:right-6']].map(([glyph, d, pos]) => (
            <button
              key={d}
              type="button"
              onClick={() => step(d)}
              className={`absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-navy/70 ring-1 ring-paper/25 transition hover:bg-paper hover:text-navy ${pos}`}
            >
              {glyph}
            </button>
          ))}
      </div>
    </div>
  );
}
