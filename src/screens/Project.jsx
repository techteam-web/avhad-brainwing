import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import gsap from 'gsap';
import { Brainwing } from '../components/Brainwing';
import { OrbitStage } from '../components/OrbitStage';
import { getProject, longDate, monthOf, viewsOf, yearOf } from '../data/projects';
import { srcAt, widthFor } from '../lib/images';

const STILL_WIDTHS = [640, 1280, 1920];
const MODES = [
  { key: 'orbit', label: 'Orbit' },
  { key: 'views', label: 'Views' },
];

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
  const [mounted, setMounted] = useState({ views: false });
  const [view, setView] = useState('top');
  const [open, setOpen] = useState(false);

  const capture = project.captures.find((c) => c.date === date) ?? project.captures[0];
  const views = useMemo(() => viewsOf(capture), [capture]);
  const active = views.find((v) => v.key === view) ?? views[0];

  const { orbit } = capture;
  // A capture may not have been flown as an orbit; the stills are always there.
  const stage = mode === 'views' ? 'views' : orbit ? 'orbit' : 'missing';

  // The index fades out; this fades in. Nothing slides, so there is no direction to get
  // backwards when you arrive or go back.
  const root = useRef(null);
  useLayoutEffect(() => {
    gsap.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
  }, []);

  // Changing stage: the two are stacked and cross-faded, with a brass hairline drawn
  // across in the direction of the tab. The stills only mount once they are first asked
  // for, and then stay, so the change is instant from the second time on.
  const orbitRef = useRef(null);
  const viewsRef = useRef(null);
  const sweep = useRef(null);
  const previous = useRef(mode);

  const go = (key) => {
    setMode(key);
    if (key === 'views') setMounted((m) => (m.views ? m : { views: true }));
  };

  useLayoutEffect(() => {
    if (previous.current === mode) return;
    const toViews = mode === 'views';
    previous.current = mode;
    const incoming = toViews ? viewsRef.current : orbitRef.current;
    const outgoing = toViews ? orbitRef.current : viewsRef.current;
    if (!incoming || !outgoing) return;

    gsap
      .timeline()
      .set(incoming, { zIndex: 2 })
      .set(outgoing, { zIndex: 1 })
      .fromTo(incoming, { opacity: 0, scale: 1.035 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'expo.out' }, 0)
      .to(outgoing, { opacity: 0, scale: 0.995, duration: 0.55, ease: 'power2.inOut' }, 0)
      .fromTo(
        sweep.current,
        { x: toViews ? 0 : innerWidth, opacity: 1 },
        { x: toViews ? innerWidth : 0, duration: 0.85, ease: 'power2.inOut' },
        0,
      )
      .set(sweep.current, { opacity: 0 });
  }, [mode]);

  return (
    <main ref={root} className="relative h-dvh w-full overflow-clip bg-ink text-bone">
      {orbit && (
        <div ref={orbitRef} className={`absolute inset-0 ${mode === 'orbit' ? '' : 'pointer-events-none'}`}>
          <OrbitStage orbit={orbit} active={mode === 'orbit'} />
        </div>
      )}
      {mounted.views && (
        <div ref={viewsRef} className={`absolute inset-0 ${mode === 'views' ? '' : 'pointer-events-none'}`}>
          <Views views={views} active={active} onOpen={() => setOpen(true)} />
        </div>
      )}
      {stage === 'missing' && <Missing date={capture.date} onViews={() => go('views')} />}

      {/* a brass hairline drawn across the change, in the direction of the tab */}
      <span ref={sweep} className="pointer-events-none absolute inset-y-0 left-0 z-40 w-px bg-brass opacity-0 shadow-[0_0_24px_6px_rgba(169,136,91,.35)]" />

      {/* The orbit can turn to face a white rooftop, and the wordmark and Index vanish into
          it. A shallow scrim along the top keeps the masthead readable on every frame. */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[22vh]"
        style={{ background: 'linear-gradient(to bottom, rgba(9,17,50,.72) 0%, rgba(9,17,50,.34) 42%, rgba(9,17,50,0) 100%)' }}
      />

      {/* masthead */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-4 p-5 md:p-8 3xl:p-10">
        <div className="pointer-events-auto flex items-center gap-4">
          <Link
            to="/"
            className="panel label group flex items-center gap-2.5 rounded-full px-5 py-2.5 text-brass-lit transition-colors duration-300 hover:bg-brass hover:text-navy-deep"
            aria-label="All developments"
          >
            <span className="inline-block transition-transform duration-500 group-hover:-translate-x-1">←</span>
            <span className="max-mob:hidden">Index</span>
          </Link>
          {/* No group lockup here: the three-line mark turns to mush at header height, and
              this page is the development's — its own wordmark carries the identity. */}
        </div>

        {/* the development is announced by its own wordmark, as the brand pack draws it */}
        <div className="flex flex-col items-end">
          <img
            src={project.logo}
            alt={project.name}
            className={`h-auto drop-shadow-[0_2px_16px_rgba(9,17,50,.95)] ${
              project.slug === 'homestead' ? 'w-[min(30vw,260px)] md:w-[min(18vw,280px)]' : 'w-[min(20vw,150px)] md:w-[min(10vw,160px)]'
            }`}
          />
          <p className="label mt-2.5 text-bone/80 [text-shadow:0_1px_10px_rgba(16,21,43,.9)]">{project.place}</p>
        </div>
      </header>

      {/* One plate holds the stage switch and, in Views, the compass points beneath it.
          Whichever is chosen is filled rose gold, so the control reads at a glance over
          any frame of the orbit. */}
      <div className="panel absolute left-1/2 top-4 z-30 flex -translate-x-1/2 flex-col items-stretch rounded-2xl p-1.5 md:top-7 3xl:top-9">
        <nav className="flex items-stretch gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => go(m.key)}
              className={`label flex-1 rounded-xl px-6 py-2.5 transition-colors duration-300 md:px-9 ${
                mode === m.key ? 'chip-on' : 'text-bone/75 hover:bg-bone/10 hover:text-bone'
              }`}
            >
              {m.label}
            </button>
          ))}
        </nav>

        {stage === 'views' && (
          <>
            <span className="mx-2 mt-1.5 h-px bg-brass/30" />
            <div className="mt-1.5 flex items-center gap-1">
              {views.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setView(v.key)}
                  className={`label-micro flex-1 rounded-lg px-3.5 py-2 transition-colors duration-300 md:px-4 ${
                    active?.key === v.key ? 'chip-on' : 'text-bone/70 hover:bg-bone/10 hover:text-bone'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Timeline captures={project.captures} date={date} onPick={setDate} />

      {stage === 'views' && active && (
        <p className="panel label pointer-events-none absolute bottom-6 left-5 z-20 rounded-full px-5 py-2.5 text-bone md:bottom-8 md:left-8 3xl:left-10">
          {active.label} elevation · {active.altitude} m · {longDate(capture.date)}
        </p>
      )}

      {open && active && <Viewer views={views} active={active} onPick={setView} onClose={() => setOpen(false)} />}

      <Brainwing tone="bone" />
    </main>
  );
}

// One photograph per compass point, all of them resident so switching is a cross-fade
// rather than a load. The four sides are chosen at as near one altitude as the flight
// allows, so the change reads as the camera swinging round the building.
function Views({ views, active, onOpen }) {
  return (
    <button type="button" onClick={onOpen} className="absolute inset-0 block cursor-zoom-in">
      {views.map((v) => (
        <img
          key={v.key}
          src={srcAt(v.photo, 1920)}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-1100 ease-[cubic-bezier(.16,1,.3,1)] ${
            active?.key === v.key ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0'
          }`}
        />
      ))}
      <span className="pointer-events-none absolute inset-0 bg-linear-to-b from-ink/45 via-transparent to-ink/35" />
    </button>
  );
}

function Missing({ date, onViews }) {
  return (
    <div className="absolute inset-0 grid place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="label-micro text-brass">{longDate(date)}</p>
        <h2 className="mt-4 text-hero font-semibold leading-tight tracking-tight text-bone">The orbit follows</h2>
        <p className="mx-auto mt-3 max-w-sm text-bone/55">This visit was photographed; the orbit flight comes with the next one.</p>
        <button type="button" onClick={onViews} className="label-micro group mt-7 inline-flex items-center gap-2 text-bone">
          <span className="h-px w-6 bg-brass transition-all duration-500 group-hover:w-10" />
          See the photographs
        </button>
      </div>
    </div>
  );
}

// The dates: a hairline rail down the right on wide screens, a row on phones. Quarters
// not yet flown sit on it hollow.
function Timeline({ captures, date, onPick }) {
  return (
    <nav className="absolute z-30 max-md:inset-x-0 max-md:bottom-16 max-md:flex max-md:justify-center md:right-8 md:top-1/2 md:-translate-y-1/2 3xl:right-10">
      <ul className="panel flex items-center gap-5 rounded-full px-5 py-2.5 md:flex-col md:items-end md:gap-5 md:rounded-2xl md:px-5 md:py-5">
        {captures.map((c) => {
          const on = c.date === date;
          return (
            <li key={c.date}>
              <button
                type="button"
                disabled={c.upcoming}
                onClick={() => onPick(c.date)}
                className={`group flex items-center gap-3 ${c.upcoming ? 'cursor-default' : ''}`}
              >
                <span
                  className={`label whitespace-nowrap transition-colors duration-300 max-md:hidden ${
                    on ? 'text-brass-lit' : c.upcoming ? 'text-bone/35' : 'text-bone/70 group-hover:text-bone'
                  }`}
                >
                  {monthOf(c.date)} {yearOf(c.date).slice(2)}
                </span>
                <span className={`block h-px transition-all duration-500 ${on ? 'w-6 bg-brass' : c.upcoming ? 'w-2 bg-bone/25' : 'w-3 bg-bone/50 group-hover:w-5'}`} />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Viewer({ views, active, onPick, onClose }) {
  const index = views.findIndex((v) => v.key === active.key);
  const step = (d) => onPick(views[(index + d + views.length) % views.length].key);

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
    gsap.fromTo('.js-viewer', { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
  }, []);

  const photo = active.photo;
  const contain = Math.min(innerWidth, innerHeight * 0.76 * (photo.width / photo.height));

  return (
    <div className="js-viewer absolute inset-0 z-50 flex flex-col bg-ink/97">
      <div className="flex items-start justify-between p-5 md:p-8">
        <div>
          <p className="label-micro text-brass">{active.label} elevation</p>
          <p className="label-micro mt-1 text-bone/50">{active.altitude} m</p>
        </div>
        <button type="button" onClick={onClose} className="label-micro text-bone/70 transition hover:text-bone">
          Close ✕
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-5 md:px-20">
        <img key={photo.id} src={srcAt(photo, widthFor(contain, STILL_WIDTHS))} alt="" className="max-h-full max-w-full object-contain" />
        {[['←', -1, 'left-1 md:left-6'], ['→', 1, 'right-1 md:right-6']].map(([glyph, d, pos]) => (
          <button key={d} type="button" onClick={() => step(d)} className={`absolute top-1/2 -translate-y-1/2 p-3 text-bone/60 transition hover:text-brass ${pos}`}>
            {glyph}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-6 p-5 md:p-8">
        {views.map((v) => (
          <button key={v.key} type="button" onClick={() => onPick(v.key)} className="group">
            <span className={`label-micro transition-colors ${v.key === active.key ? 'text-bone' : 'text-bone/40 group-hover:text-bone/70'}`}>{v.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
