import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Brainwing } from '../components/Brainwing';
import { PROJECTS, TAGLINE, coverOf, longDate } from '../data/projects';
import { srcAt } from '../lib/images';
import lockup from '../assets/avhad-lockup.svg';
import skyline from '../assets/skyline.svg';

gsap.registerPlugin(useGSAP);

// The index, laid out like the cover of the brand's own brochure: the skyline rising out
// of the left edge, the company's line set against it on the right, and the two
// developments as photographic plates along the foot of the page.
export function Landing() {
  const root = useRef(null);
  const plates = useRef([]);
  const navigate = useNavigate();
  const leaving = useRef(false);
  const [first, second] = TAGLINE.split('. ');
  const latest = PROJECTS[0].captures.find((c) => !c.upcoming);

  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .fromTo('.js-sky', { opacity: 0, x: -70, y: 30 }, { opacity: 1, x: 0, y: 0, duration: 1.7, clearProps: 'opacity,transform' })
        .fromTo('.js-mast', { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, clearProps: 'opacity,transform' }, 0.15)
        .fromTo('.js-tag', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.13, clearProps: 'opacity,transform' }, 0.4)
        .fromTo(
          '.js-plate',
          { clipPath: 'inset(0% 100% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, stagger: 0.16, clearProps: 'clipPath' },
          0.7,
        );
    },
    { scope: root },
  );

  const enter = (slug, i) => {
    if (leaving.current) return;
    leaving.current = true;
    const chosen = plates.current[i];
    const others = plates.current.filter((_, n) => n !== i);
    gsap
      .timeline({ onComplete: () => navigate(`/${slug}`) })
      .to(others, { opacity: 0, duration: 0.4, ease: 'power2.in' })
      .to('.js-tag, .js-mast, .js-sky', { opacity: 0, duration: 0.45, ease: 'power2.in', stagger: 0.04 }, 0)
      .to(chosen, { scale: 1.04, duration: 0.8, ease: 'expo.inOut' }, 0.05);
  };

  return (
    <main ref={root} className="brand-field relative flex h-dvh w-full flex-col overflow-clip text-bone">
      <span className="grain-layer z-30" />

      {/* the brand's skyline, rising out of the left edge as it does on the brochure */}
      <img
        src={skyline}
        alt=""
        className="js-sky pointer-events-none absolute -left-[7%] bottom-[26%] z-0 h-[58vh] w-auto opacity-95 md:-left-[4%] md:h-[64vh] 3xl:h-[68vh]"
      />

      <header className="z-20 flex shrink-0 items-start justify-between gap-6 px-8 pt-7 md:px-14 md:pt-10 3xl:px-20">
        <img src={lockup} alt="Avhad Real Estate Developers" className="js-mast h-14 w-auto brightness-0 invert md:h-20 3xl:h-24" />
        <div className="js-mast text-right">
          <p className="label text-bone/75">{latest ? longDate(latest.date) : '—'}</p>
          <p className="label-micro mt-1.5 text-bone/45">Construction progress</p>
        </div>
      </header>

      {/* the line the company leads with, set against the skyline */}
      <section className="z-10 flex min-h-0 flex-1 items-center justify-end px-8 md:px-14 3xl:px-20">
        <div className="max-w-[48ch] text-right">
          <h1 className="js-tag text-hero leading-[1.0]">
            {first}.
            <span className="mt-1.5 block text-brass">{second}</span>
          </h1>
          <p className="js-tag mt-6 text-body text-bone/55">
            Two developments in Mahim, flown by drone every quarter.
          </p>
        </div>
      </section>

      {/* the developments, as plates */}
      <section className="z-10 flex shrink-0 gap-4 px-8 pb-9 md:gap-6 md:px-14 md:pb-12 3xl:px-20">
        {PROJECTS.map((p, i) => {
          const cover = coverOf(p);
          return (
            <button
              key={p.slug}
              ref={(el) => (plates.current[i] = el)}
              type="button"
              onClick={() => enter(p.slug, i)}
              className="js-plate group relative h-[27vh] flex-1 origin-center overflow-hidden text-left ring-1 ring-bone/15 transition-shadow duration-500 hover:ring-brass/60 3xl:h-[30vh]"
            >
              {cover && (
                <img
                  src={srcAt(cover, 1280)}
                  alt=""
                  className="absolute inset-0 h-full w-full scale-105 object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-100"
                />
              )}
              <span className="absolute inset-0 bg-linear-to-r from-ink via-ink/75 to-ink/25 transition-opacity duration-700 group-hover:opacity-85" />

              <span className="relative flex h-full items-center justify-between gap-6 px-6 md:px-9">
                <span className="min-w-0">
                  <img
                    src={p.logo}
                    alt={p.name}
                    className={`h-auto ${p.slug === 'homestead' ? 'w-[min(22vw,250px)]' : 'w-[min(11vw,132px)]'}`}
                  />
                  <span className="label-micro mt-3.5 block truncate text-bone/60">{p.place} · {p.blurb}</span>
                </span>

                <span className="label flex shrink-0 -translate-x-2 items-center gap-3 text-brass opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100 max-md:hidden">
                  View progress
                  <span className="h-px w-8 bg-brass" />
                </span>
              </span>
            </button>
          );
        })}
      </section>

      <Brainwing tone="bone" />
    </main>
  );
}
