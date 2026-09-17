import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Brainwing } from '../components/Brainwing';
import { PROJECTS, coverOf, longDate, viewsOf } from '../data/projects';
import { srcAt } from '../lib/images';
import logo from '../assets/avhad-logo.svg';

gsap.registerPlugin(useGSAP);

// The index: the mark, the date, two names, one photograph. Everything else that was on
// this page was caption for its own sake and has gone.
export function Landing() {
  const root = useRef(null);
  const plates = useRef([]);
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const leaving = useRef(false);

  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from('.js-mast', { y: -16, opacity: 0, duration: 1, stagger: 0.08 })
        .fromTo(plates.current[0], { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4 }, 0.1)
        // A plain fade up — and fromTo with clearProps, not from(). A bare .from() leaves
        // the element holding whatever inline opacity it had reached if the context is
        // reverted mid-flight, and the names sit there half transparent looking washed
        // out. Clearing the properties at the end hands them back to the stylesheet.
        .fromTo('.js-name', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, clearProps: 'opacity,transform' }, 0.3)
        .fromTo('.js-sub', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, clearProps: 'opacity,transform' }, 0.6)
        .from('.js-rule', { scaleX: 0, duration: 1.1, stagger: 0.1 }, 0.25);

      plates.current.forEach((plate, i) => {
        gsap.to(plate, { scale: 1.08, duration: 24, ease: 'none', repeat: -1, yoyo: true, delay: i * 2 });
      });
    },
    { scope: root },
  );

  // Hovering a name pulls its photograph across the one before it.
  const show = (i) => {
    if (i === active || leaving.current) return;
    gsap.set(plates.current[i], { zIndex: 2 });
    gsap.set(plates.current[active], { zIndex: 1 });
    gsap.fromTo(plates.current[i], { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'expo.inOut' });
    setActive(i);
  };

  const enter = (slug) => {
    if (leaving.current) return;
    leaving.current = true;
    gsap
      .timeline({ onComplete: () => navigate(`/${slug}`) })
      // Out on a fade, in on a fade: the page hands over to the development instead of
      // flinging its own type about.
      .to('.js-name, .js-sub, .js-index, .js-rule, .js-mast', { opacity: 0, duration: 0.4, ease: 'power2.in', stagger: 0.03 })
      .to(plates.current[active], { scale: 1.07, duration: 0.75, ease: 'power2.inOut' }, 0);
  };

  const shown = PROJECTS[active];
  const latest = shown.captures.find((c) => !c.upcoming);
  const detail = latest ? viewsOf(latest)[0] : null;

  return (
    <main ref={root} className="paper-field relative flex h-dvh w-full flex-col text-ink">
      <span className="grain-layer z-20" />

      <header className="js-mast z-20 flex items-center justify-between gap-6 px-6 pt-6 md:px-12 md:pt-10 3xl:px-16">
        <div className="flex items-center gap-5 md:gap-7">
          <img src={logo} alt="Avhad" className="h-10 w-auto md:h-20 3xl:h-24" />
          <span className="h-8 w-px rule-ink md:h-14" />
          <p className="text-body font-medium leading-tight text-ink/75 md:text-title">
            Two developments
            <span className="block text-ink/50">Mahim, Mumbai</span>
          </p>
        </div>
        <p className="shrink-0 text-body font-semibold tracking-tight text-ink/80 md:text-title">{latest ? longDate(latest.date) : '—'}</p>
      </header>

      <div className="grid min-h-0 flex-1 items-stretch gap-0 md:grid-cols-[1fr_1fr]">
        {/* the names */}
        <div className="flex min-h-0 flex-col justify-center px-6 py-8 md:px-12 md:py-10 3xl:px-16">
          <ul>
            {PROJECTS.map((p, i) => (
              <li key={p.slug}>
                <span className="js-rule block h-px origin-left rule-ink" />
                <button
                  type="button"
                  onMouseEnter={() => show(i)}
                  onFocus={() => show(i)}
                  onClick={() => enter(p.slug)}
                  className="group flex w-full items-start gap-5 py-8 text-left md:gap-7 md:py-11 3xl:py-14"
                >
                  <span className={`js-index label mt-3 shrink-0 transition-colors duration-500 ${active === i ? 'text-brass' : 'text-ink/45'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      // the unselected name is quieter, not disabled
                      className={`js-name block text-hero font-semibold leading-[1.02] tracking-tight transition-all duration-700 ${
                        active === i ? 'text-ink md:translate-x-1.5' : 'text-ink/70'
                      }`}
                    >
                      {p.name}
                    </span>
                    <span className={`js-sub mt-3 block text-body transition-colors duration-500 ${active === i ? 'text-ink/70' : 'text-ink/55'}`}>
                      {p.blurb}
                    </span>
                  </span>
                  <span
                    className={`mt-2 hidden shrink-0 text-title transition-all duration-700 md:block ${
                      active === i ? 'translate-x-0 text-brass opacity-100' : '-translate-x-3 text-ink/25 opacity-0'
                    }`}
                  >
                    →
                  </span>
                </button>
              </li>
            ))}
            <li>
              <span className="js-rule block h-px origin-left rule-ink" />
            </li>
          </ul>
        </div>

        {/* the photograph */}
        <div className="relative min-h-0 overflow-hidden max-md:mx-6 max-md:mb-6">
          {PROJECTS.map((p, i) => {
            const photo = coverOf(p);
            return (
              photo && (
                <img
                  key={p.slug}
                  ref={(el) => (plates.current[i] = el)}
                  src={srcAt(photo, 1920)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover filter-[contrast(1.06)_saturate(1.12)_brightness(1.02)]"
                  style={{ clipPath: i === 0 ? 'inset(0% 0% 0% 0%)' : 'inset(0% 0% 0% 100%)', zIndex: i === 0 ? 2 : 1 }}
                />
              )
            );
          })}
          <div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-ink/50 via-transparent to-transparent" />
          {detail && (
            <p className="label pointer-events-none absolute bottom-5 left-5 z-10 text-bone [text-shadow:0_1px_12px_rgba(16,21,43,.95)] md:bottom-7 md:left-7">
              {shown.name} · {detail.label} · {detail.altitude} m
            </p>
          )}
        </div>
      </div>

      <Brainwing tone="ink" />
    </main>
  );
}
