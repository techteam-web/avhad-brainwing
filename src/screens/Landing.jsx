import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Brainwing } from '../components/Brainwing';
import { PROJECTS, coverOf, longDate, viewsOf } from '../data/projects';
import { srcAt } from '../lib/images';
import logo from '../assets/avhad-logo.svg';

gsap.registerPlugin(useGSAP);

// The index: a masthead, two developments set as an editorial list, and one photograph
// that answers whichever name you are looking at. No cards, no shadows — hairlines, warm
// paper and a lot of air, which is how property of this kind is presented on paper.
export function Landing() {
  const root = useRef(null);
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const leaving = useRef(false);

  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from('.js-mast', { y: -12, opacity: 0, duration: 0.9, stagger: 0.06 })
        .from('.js-row', { y: 26, opacity: 0, duration: 1.1, stagger: 0.1 }, 0.1)
        .from('.js-rule', { scaleX: 0, transformOrigin: 'left', duration: 1.1, stagger: 0.1 }, 0.2)
        .from('.js-plate', { opacity: 0, scale: 1.04, duration: 1.4 }, 0.15)
        .from('.js-foot', { opacity: 0, duration: 0.9 }, 0.7);
    },
    { scope: root },
  );

  const enter = (slug) => {
    if (leaving.current) return;
    leaving.current = true;
    gsap
      .timeline({ onComplete: () => navigate(`/${slug}`) })
      .to('.js-row, .js-mast, .js-foot, .js-rule', { opacity: 0, y: -10, duration: 0.45, ease: 'power2.in', stagger: 0.03 })
      .to('.js-plate', { scale: 1.06, duration: 0.8, ease: 'expo.in' }, 0);
  };

  const shown = PROJECTS[active];
  const cover = coverOf(shown);
  const latest = shown.captures.find((c) => !c.upcoming);
  const detail = latest ? viewsOf(latest)[0] : null;

  return (
    <main ref={root} className="grain flex h-dvh w-full flex-col bg-bone text-ink">
      <span className="grain-layer" />

      <header className="js-mast flex items-start justify-between px-5 pt-5 md:px-10 md:pt-8 3xl:px-16 3xl:pt-10">
        <img src={logo} alt="Avhad" className="h-8 w-auto md:h-10 3xl:h-12" />
        <div className="text-right">
          <p className="label text-ink/55">Construction progress</p>
          <p className="label-micro mt-1 text-ink/40">{latest ? longDate(latest.date) : '—'}</p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 md:grid-cols-[1.05fr_1fr]">
        {/* the list */}
        <div className="flex min-h-0 flex-col justify-center px-5 py-6 md:px-10 md:py-10 3xl:px-16">
          <p className="js-mast label-micro text-brass">Two developments · Mahim</p>

          <ul className="mt-5 md:mt-8">
            {PROJECTS.map((p, i) => (
              <li key={p.slug}>
                <span className="js-rule block h-px rule-ink" />
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => enter(p.slug)}
                  className="js-row group flex w-full items-baseline gap-4 py-5 text-left md:gap-6 md:py-7 3xl:py-9"
                >
                  <span className={`label-micro w-6 shrink-0 transition-colors duration-500 ${active === i ? 'text-brass' : 'text-ink/35'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-display text-hero font-light leading-[0.95] transition-colors duration-500 ${active === i ? 'text-ink' : 'text-ink/70'}`}>
                      {p.name}
                    </span>
                    <span className="label-micro mt-2 block text-ink/45">
                      {p.place} · {p.blurb}
                    </span>
                  </span>
                  <span
                    className={`mb-1 hidden shrink-0 transition-all duration-500 md:block ${
                      active === i ? 'translate-x-0 text-brass opacity-100' : '-translate-x-2 text-ink/30 opacity-0'
                    }`}
                  >
                    →
                  </span>
                </button>
              </li>
            ))}
            <li>
              <span className="js-rule block h-px rule-ink" />
            </li>
          </ul>
        </div>

        {/* the plate */}
        <div className="relative min-h-0 overflow-hidden max-md:mx-5 max-md:mb-6 md:m-6 md:ml-0 3xl:m-10 3xl:ml-0">
          {PROJECTS.map((p, i) => {
            const photo = coverOf(p);
            return (
              photo && (
                <img
                  key={p.slug}
                  src={srcAt(photo, 1280)}
                  alt=""
                  className={`js-plate absolute inset-0 h-full w-full object-cover transition-opacity duration-900 ease-out ${active === i ? 'opacity-100' : 'opacity-0'}`}
                />
              )
            );
          })}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink/55 via-transparent to-transparent" />
          {cover && (
            <p className="label-micro pointer-events-none absolute bottom-4 left-4 text-bone/85 md:bottom-5 md:left-5">
              {detail ? `${detail.label} · ${detail.altitude} m` : ''}
            </p>
          )}
        </div>
      </div>

      <footer className="js-foot flex items-center justify-between px-5 pb-5 md:px-10 md:pb-8 3xl:px-16">
        <p className="label-micro text-ink/40">Flown quarterly by drone</p>
        {/* clear of the Brainwing mark, which sits bottom right */}
        <p className="label-micro text-ink/40 max-lg:hidden lg:mr-32 3xl:mr-40">Select a development</p>
      </footer>

      <Brainwing tone="ink" />
    </main>
  );
}
