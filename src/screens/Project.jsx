import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import gsap from 'gsap';
import { Brainwing } from '../components/Brainwing';
import { OrbitStage } from '../components/OrbitStage';
import { getProject, longDate, monthOf, viewsOf, yearOf } from '../data/projects';
import { RERA_SITE } from '../data/legal';
import { fillFor, frameOn, srcAt, widthFor } from '../lib/images';

const STILL_WIDTHS = [640, 1280, 1920];
const MODES = [
  { key: 'orbit', label: 'Orbit' },
  { key: 'views', label: 'Views' },
];

export function Project() {
  const { slug } = useParams();
  const project = getProject(slug);
  if (!project) return <Navigate to="/developments" replace />;
  return <ProjectView key={slug} project={project} />;
}

function ProjectView({ project }) {
  const shot = project.captures.filter((c) => !c.upcoming);
  const [date, setDate] = useState(shot.at(-1)?.date ?? project.captures[0].date);
  const [mode, setMode] = useState('orbit');
  const [mounted, setMounted] = useState({ views: false });
  const [view, setView] = useState('top');
  const [open, setOpen] = useState(false);
  const [rera, setRera] = useState(false);

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

  // Everything laid over the photograph, measured, so the stills can keep the plot out
  // from under it in either layout.
  const header = useRef(null);
  const plate = useRef(null);
  const modes = useRef(null);
  const compass = useRef(null);
  const rail = useRef(null);
  const foot = useRef(null);
  const clear = useClearance([header, plate, modes, compass, rail, foot], stage);

  return (
    <main ref={root} className="relative h-dvh w-full overflow-clip bg-ink text-bone">
      {orbit && (
        <div ref={orbitRef} className={`absolute inset-0 ${mode === 'orbit' ? '' : 'pointer-events-none'}`}>
          <OrbitStage orbit={orbit} active={mode === 'orbit'} />
        </div>
      )}
      {mounted.views && (
        <div ref={viewsRef} className={`absolute inset-0 ${mode === 'views' ? '' : 'pointer-events-none'}`}>
          <Views views={views} active={active} clear={clear} onOpen={() => setOpen(true)} />
        </div>
      )}
      {stage === 'missing' && <Missing date={capture.date} onViews={() => go('views')} />}

      {/* a brass hairline drawn across the change, in the direction of the tab */}
      <span ref={sweep} className="pointer-events-none absolute inset-y-0 left-0 z-40 w-px bg-brass opacity-0 shadow-[0_0_24px_6px_rgba(169,136,91,.35)]" />

      {/* The orbit can turn to face a white rooftop, and the wordmark vanishes into it. A
          band just deep enough to sit behind the masthead keeps it readable on every frame —
          the photograph itself is left alone. Every control carries its own navy plate. */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[clamp(8rem,20vh,11rem)] wide:h-[clamp(5rem,11vh,10rem)]"
        style={{ background: 'linear-gradient(to bottom, rgba(9,17,50,.66) 0%, rgba(9,17,50,.3) 55%, rgba(9,17,50,0) 100%)' }}
      />

      {/* masthead */}
      <header
        ref={header}
        className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-4 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] wide:p-8 short:py-4 short:pl-[max(1.25rem,env(safe-area-inset-left))] short:pr-[max(1.25rem,env(safe-area-inset-right))] wide:3xl:p-10"
      >
        <Link
          to="/developments"
          className="panel label group pointer-events-auto flex size-11 shrink-0 items-center justify-center gap-2.5 rounded-full text-brass-lit transition-colors duration-300 hover:bg-brass hover:text-navy-deep wide:size-auto wide:px-5 wide:py-2.5 short:size-11 short:p-0"
          aria-label="All developments"
        >
          <span className="inline-block transition-transform duration-500 group-hover:-translate-x-1">←</span>
          <span className="hidden wide:inline short:hidden">Index</span>
        </Link>
        {/* No group lockup here: the three-line mark turns to mush at header height, and
            this page is the development's — its own wordmark carries the identity. */}

        {/* the development is announced by its own wordmark, as the brand pack draws it */}
        <div className="flex min-w-0 flex-col items-end">
          <img
            src={project.logo}
            alt={project.name}
            className={`h-auto drop-shadow-[0_2px_16px_rgba(9,17,50,.95)] ${
              project.slug === 'homestead'
                ? 'w-[min(46vw,200px)] wide:w-[min(18vw,280px)] short:w-[min(20vw,180px)]'
                : 'w-[min(26vw,108px)] wide:w-[min(10vw,160px)] short:w-[min(10vw,84px)]'
            }`}
          />
          <p className="label-micro mt-2 text-bone/80 [text-shadow:0_1px_10px_rgba(16,21,43,.9)] wide:label wide:mt-2.5">{project.place}</p>
          {/* narrow: the registration sits under the name; wide has it at the foot */}
          {project.rera && <ReraChip rera={project.rera} onOpen={() => setRera(true)} className="mt-2.5 flex wide:hidden" />}
        </div>
      </header>

      {/* Narrow: a dock along the foot — the stage plate and the dates — standing
          clear of the maker's mark. Wide: `contents`, so each part takes its own place — and
          needs its own z-index, since the dock's goes with its box and the stage being
          faded in is lifted to 2. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2.5 px-4 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+2rem)] wide:contents">
        {/* wide: the registration at the foot, bottom left */}
        {project.rera && (
          <div ref={foot} className="hidden wide:absolute wide:bottom-8 wide:left-8 wide:z-20 wide:flex short:bottom-4 short:left-[max(1.25rem,env(safe-area-inset-left))] wide:3xl:left-10">
            <ReraChip rera={project.rera} onOpen={() => setRera(true)} className="flex" />
          </div>
        )}

        {/* One plate holds the stage switch and, in Views, the compass points. Whichever is
            chosen is filled rose gold, so it reads at a glance over any frame of the orbit.
            In the dock the switch sits lowest, under the thumb, and the compass points open
            above it; at the head of a wide screen they hang beneath it. On a phone on its
            side there is no height for both, so the plate lets go of them (`contents`): the
            switch stays at the head, and the compass stands down the left edge as a rail,
            answering the dates on the right. */}
        <div
          ref={plate}
          className="panel pointer-events-auto flex w-full max-w-md flex-col-reverse items-stretch rounded-2xl p-1.5 wide:absolute wide:z-30 wide:left-1/2 wide:top-7 wide:w-auto wide:max-w-none wide:-translate-x-1/2 wide:flex-col short:contents wide:3xl:top-9"
        >
          <nav ref={modes} className="flex items-stretch gap-1.5 short:panel short:absolute short:left-1/2 short:top-4 short:z-30 short:-translate-x-1/2 short:rounded-2xl short:p-1.5">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => go(m.key)}
                className={`label flex-1 rounded-xl px-6 py-2.5 transition-colors duration-300 wide:px-9 short:px-6 short:py-2 ${
                  mode === m.key ? 'chip-on' : 'text-bone/75 hover:bg-bone/10 hover:text-bone'
                }`}
              >
                {m.label}
              </button>
            ))}
          </nav>

          {stage === 'views' && (
            <>
              <span className="mx-2 my-1.5 h-px bg-brass/30 short:hidden" />
              <div
                ref={compass}
                className="flex items-center gap-1 short:panel short:absolute short:left-[max(1.25rem,env(safe-area-inset-left))] short:top-1/2 short:z-30 short:-translate-y-1/2 short:flex-col short:items-stretch short:rounded-2xl short:p-1.5"
              >
                {views.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setView(v.key)}
                    className={`label-micro flex-1 rounded-lg px-1 py-2 transition-colors duration-300 wide:px-4 short:flex-none short:px-5 short:py-1.5 ${
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

        <Timeline ref={rail} captures={project.captures} date={date} onPick={setDate} />
      </div>

      {open && active && <Viewer views={views} active={active} onPick={setView} onClose={() => setOpen(false)} />}
      {rera && project.rera && <ReraSheet rera={project.rera} onClose={() => setRera(false)} />}

      <Brainwing tone="bone" />
    </main>
  );
}

// How far in from each edge of the screen the controls reach, read off the controls
// themselves rather than assumed, since they sit in different places in the two layouts
// and change size between the stages. A control in the top part of the screen covers the
// top, one in the bottom part the bottom, and one standing in the middle — the date rail —
// covers its side.
function useClearance(refs, stage) {
  const [clear, setClear] = useState(() => ({ vw: innerWidth, vh: innerHeight, top: 0, right: 0, bottom: 0, left: 0 }));

  useLayoutEffect(() => {
    const measure = () => {
      const vw = innerWidth;
      const vh = innerHeight;
      const c = { top: 0, right: 0, bottom: 0, left: 0 };
      for (const ref of refs) {
        const r = ref.current?.getBoundingClientRect();
        if (!r?.width || !r?.height) continue; // not shown in this layout
        if (r.bottom < vh * 0.45) c.top = Math.max(c.top, r.bottom);
        else if (r.top > vh * 0.55) c.bottom = Math.max(c.bottom, vh - r.top);
        else if (r.left > vw * 0.5) c.right = Math.max(c.right, vw - r.left);
        else c.left = Math.max(c.left, r.right);
      }
      const air = Math.min(vw, vh) * 0.03; // so the outline's glow does not touch a plate
      const next = { vw, vh, top: c.top + air, right: c.right + air, bottom: c.bottom + air, left: c.left + air };
      setClear((was) => (Object.keys(next).every((k) => Math.abs(next[k] - was[k]) < 0.5) ? was : next));
    };
    const watch = new ResizeObserver(measure);
    for (const ref of refs) if (ref.current) watch.observe(ref.current);
    addEventListener('resize', measure);
    measure();
    return () => {
      watch.disconnect();
      removeEventListener('resize', measure);
    };
    // the refs are stable; what they hold changes with the stage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  return clear;
}

// One photograph per compass point, all of them resident so switching is a cross-fade
// rather than a load. The four sides are chosen at as near one altitude as the flight
// allows, so the change reads as the camera swinging round the building.
//
// Each is framed on its outlined plot. Where covering the screen would push part of the
// outline off it or under a control — any phone held upright — the photograph is drawn
// smaller, as a band over a blurred copy of itself. The whole set shares one scale, so
// swinging round does not also zoom in and out.
function Views({ views, active, clear, onOpen }) {
  const { vw, vh } = clear;
  const ratio = (v) => v.photo.width / v.photo.height;
  const least = Math.min(...views.map((v) => fillFor(vw, vh, ratio(v), v.plot, clear)));
  // a sliver of blur down each side would read as a mistake, not a choice
  const fill = least > 0.92 ? 1 : least;

  return (
    <button type="button" onClick={onOpen} className="absolute inset-0 block cursor-zoom-in overflow-hidden" aria-label="Open the photograph">
      {views.map((v) => {
        const on = active?.key === v.key;
        const box = frameOn(vw, vh, ratio(v), v.plot, clear, fill);
        const band = box.height < vh - 1 ? 'to bottom' : box.width < vw - 1 ? 'to right' : null;
        const fade = `transition-[opacity,scale] duration-1100 ease-[cubic-bezier(.16,1,.3,1)] ${on ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0'}`;
        return (
          <Fragment key={v.key}>
            {band && <img src={srcAt(v.photo, 640)} alt="" className={`absolute inset-0 h-full w-full object-cover blur-2xl brightness-40 ${fade}`} />}
            <img
              src={srcAt(v.photo, 1920)}
              alt=""
              className={`absolute max-w-none ${fade}`}
              style={{
                ...box,
                // the band's long edges melt into the blur rather than stopping on a line
                maskImage: band ? `linear-gradient(${band}, transparent, #000 4%, #000 96%, transparent)` : undefined,
              }}
            />
          </Fragment>
        );
      })}
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

// The dates, every quarter named: a hairline rail down the right on wide screens, a row in
// the dock on narrow ones, scrolling sideways once the quarters outgrow it. Quarters not
// yet flown sit on it hollow.
function Timeline({ ref, captures, date, onPick }) {
  return (
    <nav ref={ref} className="pointer-events-auto max-w-full wide:absolute wide:z-30 wide:right-8 wide:top-1/2 wide:-translate-y-1/2 short:right-[max(1.25rem,env(safe-area-inset-right))] wide:3xl:right-10">
      <ul className="panel flex items-center gap-1 overflow-x-auto rounded-full px-2.5 py-0.5 scrollbar-none wide:flex-col wide:items-end wide:gap-5 wide:overflow-visible wide:rounded-2xl wide:p-5 short:gap-3 short:p-3.5">
        {captures.map((c) => {
          const on = c.date === date;
          return (
            <li key={c.date} className="shrink-0">
              <button
                type="button"
                disabled={c.upcoming}
                onClick={() => onPick(c.date)}
                aria-current={on ? 'date' : undefined}
                className={`group flex flex-col items-center gap-1.5 px-2.5 py-2.5 wide:flex-row wide:gap-3 wide:p-0 ${c.upcoming ? 'cursor-default' : ''}`}
              >
                <span
                  className={`label-micro whitespace-nowrap transition-colors duration-300 wide:label ${
                    on ? 'text-brass-lit' : c.upcoming ? 'text-bone/40' : 'text-bone/70 group-hover:text-bone'
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

// The development's MahaRERA registration, always on screen, opening the full details.
function ReraChip({ rera, onOpen, className = '' }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`panel label-micro pointer-events-auto items-center gap-2 rounded-full px-3.5 py-1.5 text-bone/85 transition-colors duration-300 hover:text-bone ${className}`}
      aria-label={`MahaRERA registration ${rera.number}`}
    >
      <span className="text-brass-lit">MahaRERA</span>
      {rera.number}
    </button>
  );
}

function ReraSheet({ rera, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  useLayoutEffect(() => {
    gsap.fromTo('.js-rera', { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
    gsap.fromTo('.js-rera-card', { y: 18 }, { y: 0, duration: 0.6, ease: 'expo.out' });
  }, []);

  return (
    <div className="js-rera absolute inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/85 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rera-title"
        onClick={(e) => e.stopPropagation()}
        className="js-rera-card panel w-full max-w-sm rounded-2xl p-6 wide:max-w-md wide:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-micro text-brass">Maharashtra RERA</p>
            <h2 id="rera-title" className="mt-2 text-title">
              {rera.project}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="label-micro -m-2 p-2 text-bone/70 transition hover:text-bone" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="mt-6 flex items-center gap-5">
          <img src={rera.qr} alt={`MahaRERA QR code for ${rera.project}`} className="size-28 shrink-0 rounded-lg wide:size-32" />
          <dl className="flex min-w-0 flex-col gap-3.5">
            <div>
              <dt className="label-micro text-bone/50">Registration no.</dt>
              <dd className="label mt-1 break-all text-brass-lit">{rera.number}</dd>
            </div>
            <div>
              <dt className="label-micro text-bone/50">Valid until</dt>
              <dd className="label mt-1 text-bone">{longDate(rera.validUntil)}</dd>
            </div>
          </dl>
        </div>

        <p className="mt-6 text-micro text-bone/60">Promoter · {rera.promoter}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t border-brass/25 pt-5">
          <a href={rera.url} target="_blank" rel="noreferrer" className="label-micro group inline-flex items-center gap-2 text-bone transition-colors hover:text-brass-lit">
            Verify on MahaRERA
            <span className="h-px w-6 bg-brass transition-all duration-500 group-hover:w-9" />
          </a>
          <a href={RERA_SITE} target="_blank" rel="noreferrer" className="text-micro text-bone/45 transition-colors hover:text-bone/80">
            {RERA_SITE.replace('https://', '')}
          </a>
        </div>
      </div>
    </div>
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

  // a sideways swipe steps round the compass, as the arrow keys do
  const swipe = useRef(null);

  const photo = active.photo;
  const contain = Math.min(innerWidth, innerHeight * 0.76 * (photo.width / photo.height));

  return (
    <div className="js-viewer absolute inset-0 z-50 flex flex-col bg-ink/97">
      <div className="flex items-start justify-between p-5 pt-[max(1.25rem,env(safe-area-inset-top))] md:p-8">
        <div>
          <p className="label-micro text-brass">{active.label} elevation</p>
          <p className="label-micro mt-1 text-bone/50">{active.altitude} m</p>
        </div>
        <button type="button" onClick={onClose} className="label-micro -m-2 p-2 text-bone/70 transition hover:text-bone">
          Close ✕
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-5 md:px-20"
        onPointerDown={(e) => (swipe.current = e.clientX)}
        onPointerUp={(e) => {
          if (swipe.current === null) return;
          const dx = e.clientX - swipe.current;
          swipe.current = null;
          if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => (swipe.current = null)}
      >
        <img key={photo.id} src={srcAt(photo, widthFor(contain, STILL_WIDTHS))} alt="" className="max-h-full max-w-full object-contain" />
        {[['←', -1, 'left-0 md:left-6'], ['→', 1, 'right-0 md:right-6']].map(([glyph, d, pos]) => (
          <button key={d} type="button" onClick={() => step(d)} className={`absolute top-1/2 -translate-y-1/2 p-3 text-bone/60 transition hover:text-brass ${pos}`}>
            {glyph}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-x-3 p-4 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+2rem)] md:gap-6 md:p-8">
        {views.map((v) => (
          <button key={v.key} type="button" onClick={() => onPick(v.key)} className="group px-1.5 py-2">
            <span className={`label-micro transition-colors ${v.key === active.key ? 'text-bone' : 'text-bone/40 group-hover:text-bone/70'}`}>{v.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
