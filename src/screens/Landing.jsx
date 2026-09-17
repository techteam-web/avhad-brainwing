import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Brainwing } from '../components/Brainwing';
import { PROJECTS, coverOf, longDate, viewsOf } from '../data/projects';
import { srcAt } from '../lib/images';
import logo from '../assets/avhad-logo.svg';

gsap.registerPlugin(useGSAP);

// The index. A masthead, two developments set as an editorial list, and one full-bleed
// photograph that answers whichever name you are looking at — the plate wipes across on
// a curtain, and drifts slowly the whole time so the page is never quite still.
export function Landing() {
  const root = useRef(null);
  const plates = useRef([]);
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const leaving = useRef(false);

  useGSAP(
    () => {
      // Arrival.
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from('.js-mast', { y: -14, opacity: 0, duration: 1, stagger: 0.07 })
        .fromTo(plates.current[0], { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5 }, 0.1)
        .from('.js-name', { yPercent: 115, duration: 1.2, stagger: 0.1 }, 0.35)
        .from('.js-sub', { opacity: 0, y: 10, duration: 0.9, stagger: 0.08 }, 0.7)
        .from('.js-rule', { scaleX: 0, duration: 1.2, stagger: 0.08 }, 0.3)
        .from('.js-meta', { opacity: 0, y: 12, duration: 0.9, stagger: 0.07 }, 0.9)
        .from('.js-foot', { opacity: 0, duration: 0.9 }, 1);

      // A slow drift on every plate, so the photograph breathes rather than sits.
      plates.current.forEach((plate, i) => {
        gsap.to(plate, { scale: 1.09, duration: 22, ease: 'none', repeat: -1, yoyo: true, delay: i * 2 });
      });
    },
    { scope: root },
  );

  // Hovering a name pulls its photograph across the one before it.
  const show = (i) => {
    if (i === active || leaving.current) return;
    const incoming = plates.current[i];
    gsap.set(incoming, { zIndex: 2 });
    gsap.set(plates.current[active], { zIndex: 1 });
    gsap.fromTo(incoming, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.05, ease: 'expo.inOut' });
    setActive(i);
  };

  const enter = (slug) => {
    if (leaving.current) return;
    leaving.current = true;
    gsap
      .timeline({ onComplete: () => navigate(`/${slug}`) })
      .to('.js-name, .js-sub, .js-index', { yPercent: -110, opacity: 0, duration: 0.6, ease: 'power3.in', stagger: 0.04 })
      .to('.js-rule, .js-mast, .js-meta, .js-foot', { opacity: 0, duration: 0.4, ease: 'power2.in' }, 0)
      .to('.js-stage', { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut' }, 0.1)
      .to(plates.current[active], { scale: 1.14, duration: 1.1, ease: 'expo.inOut' }, 0);
  };

  const shown = PROJECTS[active];
  const latest = shown.captures.find((c) => !c.upcoming);
  const detail = latest ? viewsOf(latest)[0] : null;
  const frames = PROJECTS.reduce((n, p) => n + (p.captures.find((c) => !c.upcoming) ? viewsOf(p.captures.find((c) => !c.upcoming)).length : 0), 0);

  return (
    <main ref={root} className="grain flex h-dvh w-full flex-col bg-bone text-ink">
      <span className="grain-layer z-20" />

      <header className="js-mast z-20 flex items-start justify-between px-5 pt-5 md:px-10 md:pt-8 3xl:px-16 3xl:pt-10">
        <img src={logo} alt="Avhad" className="h-8 w-auto md:h-10 3xl:h-12" />
        <div className="text-right">
          <p className="label text-ink/55">Construction progress</p>
          <p className="label-micro mt-1 text-ink/40">{latest ? longDate(latest.date) : '—'}</p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 md:grid-cols-[1.02fr_1fr]">
        {/* the list */}
        <div className="flex min-h-0 flex-col justify-center px-5 py-5 md:px-10 md:py-8 3xl:px-16">
          <p className="js-mast label-micro text-brass">Two developments · Mahim</p>

          <ul className="mt-4 md:mt-7">
            {PROJECTS.map((p, i) => (
              <li key={p.slug}>
                <span className="js-rule block h-px origin-left rule-ink" />
                <button
                  type="button"
                  onMouseEnter={() => show(i)}
                  onFocus={() => show(i)}
                  onClick={() => enter(p.slug)}
                  className="group flex w-full items-baseline gap-4 py-5 text-left md:gap-6 md:py-7 3xl:py-9"
                >
                  <span className={`js-index label-micro w-6 shrink-0 transition-colors duration-500 ${active === i ? 'text-brass' : 'text-ink/35'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block overflow-hidden">
                      <span
                        className={`js-name block font-display text-hero font-light leading-[0.95] transition-all duration-700 ${
                          active === i ? 'text-ink md:translate-x-2' : 'text-ink/55'
                        }`}
                      >
                        {p.name}
                      </span>
                    </span>
                    <span className={`js-sub label-micro mt-2 block transition-colors duration-500 ${active === i ? 'text-ink/60' : 'text-ink/35'}`}>
                      {p.place} · {p.blurb}
                    </span>
                  </span>
                  <span
                    className={`mb-1 hidden shrink-0 transition-all duration-700 md:block ${
                      active === i ? 'translate-x-0 text-brass opacity-100' : '-translate-x-3 text-ink/30 opacity-0'
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

          {/* the space under the list earns its keep */}
          <dl className="mt-7 flex gap-8 md:mt-10 md:gap-12">
            {[
              ['Flights', 'Quarterly'],
              ['Elevations', String(frames).padStart(2, '0')],
              ['Latest', latest ? longDate(latest.date).replace(/ \d{4}$/, '') : '—'],
            ].map(([term, value]) => (
              <div key={term} className="js-meta">
                <dt className="label-micro text-ink/35">{term}</dt>
                <dd className="mt-1.5 font-display text-title font-light leading-none text-ink/80">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* the plate — full bleed to the edge of the page */}
        <div className="js-stage relative min-h-0 overflow-hidden max-md:mx-5 max-md:mb-5">
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
          <div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-ink/45 via-transparent to-transparent" />
          {detail && (
            <p className="label-micro pointer-events-none absolute bottom-4 left-4 z-10 text-bone/90 [text-shadow:0_1px_10px_rgba(16,21,43,.9)] md:bottom-6 md:left-6">
              {shown.name} · {detail.label} · {detail.altitude} m
            </p>
          )}
        </div>
      </div>

      <footer className="js-foot z-20 flex items-center justify-between px-5 pb-5 md:px-10 md:pb-8 3xl:px-16">
        <p className="label-micro text-ink/40">Flown quarterly by drone</p>
        <p className="label-micro text-ink/40 max-lg:hidden lg:mr-32 3xl:mr-40">Select a development</p>
      </footer>

      <Brainwing tone="ink" />
    </main>
  );
}
