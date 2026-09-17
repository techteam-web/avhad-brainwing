import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Brainwing } from '../components/Brainwing';
import { PROJECTS, TAGLINE, coverOf, longDate, viewsOf } from '../data/projects';
import { srcAt } from '../lib/images';
import lockup from '../assets/avhad-lockup.svg';
import swoosh from '/images/swoosh-gold.png';

gsap.registerPlugin(useGSAP);

// The index, built on the brand pack: the blue ground, Archivo for the line the company
// leads with, rose gold for the live mark, and each development shown by its own wordmark
// rather than as typed-out text.
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
        .fromTo('.js-mast', { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 1, stagger: 0.08, clearProps: 'opacity,transform' })
        .fromTo(plates.current[0], { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5 }, 0.1)
        .fromTo('.js-line', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, stagger: 0.12, clearProps: 'opacity,transform' }, 0.3)
        .fromTo('.js-row', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, clearProps: 'opacity,transform' }, 0.7)
        .fromTo('.js-rule', { scaleX: 0 }, { scaleX: 1, duration: 1.1, stagger: 0.1, clearProps: 'transform' }, 0.5);

      plates.current.forEach((plate, i) => {
        gsap.to(plate, { scale: 1.08, duration: 26, ease: 'none', repeat: -1, yoyo: true, delay: i * 2 });
      });
    },
    { scope: root },
  );

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
      .to('.js-line, .js-row, .js-mast, .js-rule', { opacity: 0, duration: 0.4, ease: 'power2.in', stagger: 0.03 })
      .to(plates.current[active], { scale: 1.07, duration: 0.75, ease: 'power2.inOut' }, 0);
  };

  const shown = PROJECTS[active];
  const latest = shown.captures.find((c) => !c.upcoming);
  const detail = latest ? viewsOf(latest)[0] : null;
  const [first, second] = TAGLINE.split('. ');

  return (
    <main ref={root} className="brand-field relative flex h-dvh w-full flex-col overflow-clip text-bone">
      <span className="grain-layer z-20" />

      {/* an architectural rise in the ground itself — the brand's own device, tinted */}
      {/* kept up behind the headline, where it reads as a skyline rising out of the
          ground rather than as stray boxes behind the list */}
      <div className="pointer-events-none absolute left-0 top-0 z-0 hidden h-[52%] w-1/2 md:block">
        {[
          ['12%', '46%'],
          ['22%', '72%'],
          ['31%', '34%'],
        ].map(([left, height]) => (
          <span key={left} className="absolute bottom-0 w-[9%] bg-bone/[0.022]" style={{ left, height }} />
        ))}
      </div>

      {/* shrink-0 so the headline below can never ride up into the mark or the date */}
      <header className="z-20 flex shrink-0 items-center justify-between gap-6 px-6 pt-6 md:items-start md:px-12 md:pt-9 3xl:px-16">
        <img src={lockup} alt="Avhad Real Estate Developers" className="js-mast h-12 w-auto brightness-0 invert md:h-20 3xl:h-24" />
        <p className="js-mast label text-bone/70">{latest ? longDate(latest.date) : '—'}</p>
      </header>

      {/* On a phone this is a column of three fixed bands — words, developments,
          photograph — so nothing can ride up into the mark or off the bottom. The wide
          layout keeps the two-column split. */}
      <div className="z-10 flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[1.06fr_1fr]">
        {/* the line the company leads with, then the two developments */}
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-5 overflow-hidden px-6 pb-2 pt-4 md:gap-10 md:px-12 md:py-8 3xl:px-16">
          <div>
            <h1 className="js-line text-[clamp(1.6rem,7vw,4.5rem)] leading-[1.02] md:text-hero md:leading-[0.98]">
              {first}.
              <span className="mt-1 block text-brass">{second}</span>
            </h1>
            <p className="js-line mt-3 max-w-md text-body text-bone/60 md:mt-5">
              Two developments in Mahim, flown by drone every quarter. Follow each one as it rises.
            </p>
          </div>

          <ul className="w-full">
            {PROJECTS.map((p, i) => (
              <li key={p.slug}>
                <span className="js-rule block h-px origin-left rule-bone" />
                <button
                  type="button"
                  onMouseEnter={() => show(i)}
                  onFocus={() => show(i)}
                  onClick={() => enter(p.slug)}
                  className="js-row group flex w-full items-center gap-5 py-6 text-left md:gap-7 md:py-8"
                >
                  <span className={`label shrink-0 transition-colors duration-500 ${active === i ? 'text-brass' : 'text-bone/35'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <span className="min-w-0 flex-1">
                    {/* the development's own wordmark, at the proportion it was drawn */}
                    <img
                      src={p.logo}
                      alt={p.name}
                      className={`${
                        p.slug === 'homestead' ? 'w-[min(52vw,300px)] md:w-[min(24vw,300px)]' : 'w-[min(32vw,178px)] md:w-[min(14vw,178px)]'
                      } h-auto transition-all duration-700 ${active === i ? 'opacity-100 md:translate-x-1' : 'opacity-60'}`}
                    />
                    <span className={`mt-3 block text-body transition-colors duration-500 ${active === i ? 'text-bone/70' : 'text-bone/40'}`}>
                      {p.place} · {p.blurb}
                    </span>
                    <img
                      src={swoosh}
                      alt=""
                      className={`mt-3 h-auto w-28 origin-left transition-all duration-700 md:w-36 ${active === i ? 'scale-x-100 opacity-90' : 'scale-x-0 opacity-0'}`}
                    />
                  </span>

                  <span
                    className={`hidden shrink-0 text-title transition-all duration-700 md:block ${
                      active === i ? 'translate-x-0 text-brass opacity-100' : '-translate-x-3 text-bone/20 opacity-0'
                    }`}
                  >
                    →
                  </span>
                </button>
              </li>
            ))}
            <li>
              <span className="js-rule block h-px origin-left rule-bone" />
            </li>
          </ul>
        </div>

        {/* the photograph */}
        {/* on a phone the photograph gets a real share of the screen rather than a sliver */}
        <div className="relative min-h-0 overflow-hidden max-md:mx-6 max-md:mb-6 max-md:h-[34vh] max-md:shrink-0 md:m-8 md:ml-0 3xl:m-12 3xl:ml-0">
          {PROJECTS.map((p, i) => {
            const photo = coverOf(p);
            return (
              photo && (
                <img
                  key={p.slug}
                  ref={(el) => (plates.current[i] = el)}
                  src={srcAt(photo, 1920)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover filter-[contrast(1.06)_saturate(1.1)]"
                  style={{ clipPath: i === 0 ? 'inset(0% 0% 0% 0%)' : 'inset(0% 0% 0% 100%)', zIndex: i === 0 ? 2 : 1 }}
                />
              )
            );
          })}
          <div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-ink/70 via-transparent to-transparent" />
          <span className="pointer-events-none absolute inset-0 z-10 ring-1 ring-inset ring-brass/25" />
          {detail && (
            <p className="label-micro pointer-events-none absolute bottom-5 left-5 z-10 text-bone/90 md:bottom-6 md:left-6">
              {detail.label} elevation · {detail.altitude} m
            </p>
          )}
        </div>
      </div>

      <Brainwing tone="bone" />
    </main>
  );
}
