import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import gsap from 'gsap';
import { Brainwing } from '../components/Brainwing';
import { OrbitStage } from '../components/OrbitStage';
import { SplatStage } from '../components/SplatStage';
import { getProject, longDate, monthOf, viewsOf, yearOf } from '../data/projects';
import { srcAt, widthFor } from '../lib/images';
import logo from '../assets/avhad-logo.svg';

const STILL_WIDTHS = [640, 1280, 1920];
const MODES = [
  { key: 'orbit', label: 'Orbit' },
  { key: 'splat', label: '3D' },
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
  const [view, setView] = useState('top');
  const [open, setOpen] = useState(false);

  const capture = project.captures.find((c) => c.date === date) ?? project.captures[0];
  const views = useMemo(() => viewsOf(capture), [capture]);
  const active = views.find((v) => v.key === view) ?? views[0];

  const { orbit, splat } = capture;
  const stage = mode === 'views' ? 'views' : mode === 'orbit' && orbit ? 'orbit' : mode === 'splat' && splat ? 'splat' : 'missing';

  return (
    <main className="relative h-dvh w-full overflow-clip bg-ink text-bone">
      {stage === 'orbit' && <OrbitStage orbit={orbit} />}
      {stage === 'splat' && <SplatStage splat={splat} />}
      {stage === 'views' && <Views views={views} active={active} onOpen={() => setOpen(true)} />}
      {stage === 'missing' && <Missing mode={mode} date={capture.date} onViews={() => setMode('views')} />}

      {/* masthead */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-4 p-5 md:p-8 3xl:p-10">
        <div className="pointer-events-auto flex items-center gap-4">
          <Link
            to="/"
            className="label-micro group flex items-center gap-2 text-bone/85 transition [text-shadow:0_1px_10px_rgba(16,21,43,.9)] hover:text-bone"
            aria-label="All developments"
          >
            <span className="inline-block transition-transform duration-500 group-hover:-translate-x-1">←</span>
            <span className="max-mob:hidden">Index</span>
          </Link>
          <span className="h-4 w-px rule-bone" />
          <img src={logo} alt="Avhad" className="h-5 w-auto brightness-0 invert drop-shadow-[0_1px_10px_rgba(16,21,43,.9)] md:h-6" />
        </div>

        <div className="text-right">
          <h1 className="font-display text-title font-light leading-none text-bone [text-shadow:0_1px_14px_rgba(16,21,43,.9)]">{project.name}</h1>
          <p className="label-micro mt-1.5 text-bone/75 [text-shadow:0_1px_10px_rgba(16,21,43,.9)]">{project.place}</p>
        </div>
      </header>

      {/* the three stages — a hairline control, not a pill */}
      {/* One cluster holds the stage switch and, in Views, the compass points beneath it.
          A flat wash carries them over a white building — blurring the backdrop instead
          just smears a grey block across the photograph. */}
      <div className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 flex-col items-center rounded-2xl bg-ink/45 px-6 py-2.5 md:top-7 3xl:top-9">
        <nav className="flex items-center gap-6 md:gap-9">
          {MODES.map((m) => (
            <button key={m.key} type="button" onClick={() => setMode(m.key)} className="group relative pb-1.5">
              <span className={`label-micro transition-colors duration-300 ${mode === m.key ? 'text-bone' : 'text-bone/60 group-hover:text-bone/90'}`}>{m.label}</span>
              <span className={`absolute inset-x-0 bottom-0 h-px origin-center transition-transform duration-500 ${mode === m.key ? 'scale-x-100 bg-brass' : 'scale-x-0 bg-bone/40'}`} />
            </button>
          ))}
        </nav>

        {stage === 'views' && (
          <>
            <span className="mt-2 h-px w-full rule-bone" />
            <div className="mt-2 flex gap-5 md:gap-7">
              {views.map((v) => (
                <button key={v.key} type="button" onClick={() => setView(v.key)} className="group">
                  <span className={`label-micro transition-colors duration-300 ${active?.key === v.key ? 'text-brass-lit' : 'text-bone/65 group-hover:text-bone/95'}`}>
                    {v.label}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Timeline captures={project.captures} date={date} onPick={setDate} />

      {stage === 'views' && active && (
        <p className="label-micro pointer-events-none absolute bottom-6 left-5 z-20 rounded-full bg-ink/45 px-3.5 py-1.5 text-bone/85 md:bottom-8 md:left-8 3xl:left-10">
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

function Missing({ mode, date, onViews }) {
  const copy = {
    orbit: ['The orbit follows', 'This visit was photographed; the orbit flight comes with the next one.'],
    splat: ['No 3D scene for this visit', 'It is reconstructed from the orbit footage, so it follows once that is flown.'],
  }[mode] ?? ['Nothing here yet', ''];

  return (
    <div className="absolute inset-0 grid place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="label-micro text-brass">{longDate(date)}</p>
        <h2 className="mt-4 font-display text-hero font-light leading-tight text-bone">{copy[0]}</h2>
        <p className="mx-auto mt-3 max-w-sm text-bone/55">{copy[1]}</p>
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
      <ul className="flex items-center gap-5 rounded-full bg-ink/45 px-4 py-2 md:flex-col md:items-end md:gap-5 md:rounded-2xl md:px-4 md:py-4">
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
                  className={`label-micro whitespace-nowrap transition-colors duration-300 [text-shadow:0_1px_10px_rgba(16,21,43,.9)] max-md:hidden ${
                    on ? 'text-bone' : c.upcoming ? 'text-bone/40' : 'text-bone/70 group-hover:text-bone/95'
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
