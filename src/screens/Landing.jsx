import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Brainwing } from '../components/Brainwing';
import { PROJECTS, TAGLINE, monthYear } from '../data/projects';
import lockup from '../assets/avhad-lockup.svg';
import skyline from '../assets/skyline.svg';

gsap.registerPlugin(useGSAP);

// The index, on a centre axis: the lockup at the head of the page, the two developments
// side by side beneath it as the thing you came to choose between, and the company's line
// closing the page along the foot. The brand's skyline stands on the left, and nothing
// answers it on the right: the plates and the type carry that side.
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
        .fromTo('.js-sky', { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 1.7, clearProps: 'opacity,transform' })
        .fromTo('.js-mast', { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 1, stagger: 0.09, clearProps: 'opacity,transform' }, 0.1)
        .fromTo(
          '.js-plate',
          { opacity: 0, y: 46, clipPath: 'inset(100% 0% 0% 0%)' },
          { opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.25, stagger: 0.14, clearProps: 'opacity,transform,clipPath' },
          0.4,
        )
        .fromTo('.js-tag', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.12, clearProps: 'opacity,transform' }, 0.75);
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
      .to(others, { opacity: 0, y: 24, duration: 0.45, ease: 'power2.in' })
      .to('.js-tag, .js-mast, .js-sky', { opacity: 0, duration: 0.45, ease: 'power2.in', stagger: 0.04 }, 0)
      .to(chosen, { scale: 1.06, duration: 0.85, ease: 'expo.inOut' }, 0.05);
  };

  return (
    <main ref={root} className="brand-field relative flex h-dvh w-full flex-col overflow-clip text-bone">
      <span className="grain-layer z-30" />

      {/* the brand's own skyline, standing out of the left edge as it does on the brochure */}
      <img src={skyline} alt="" className="js-sky pointer-events-none absolute -left-[6%] bottom-0 z-0 h-[62vh] w-auto md:-left-[3%] md:h-[68vh] 3xl:h-[72vh]" />

      {/* the head of the page: the lockup on the centre axis, the capture date out to the side */}
      <header className="relative z-20 shrink-0 px-8 pt-8 md:px-14 md:pt-11 3xl:px-20 3xl:pt-14">
        <img src={lockup} alt="Avhad Real Estate Developers" className="js-mast mx-auto h-16 w-auto brightness-0 invert md:h-20 3xl:h-[5.75rem]" />
        <div className="js-mast absolute right-8 top-8 text-right md:right-14 md:top-11 3xl:right-20 3xl:top-14">
          <p className="label text-bone/75">{latest ? monthYear(latest.date) : '—'}</p>
          <p className="label-micro mt-1.5 text-bone/45">Construction progress</p>
        </div>
      </header>

      {/* the two developments, centred — the choice the page exists to offer */}
      <section className="relative z-10 flex min-h-0 flex-1 items-center justify-center gap-6 px-8 py-8 md:gap-9 md:px-14 md:py-10 3xl:gap-12 3xl:px-20">
        {PROJECTS.map((p, i) => (
            <button
              key={p.slug}
              ref={(el) => (plates.current[i] = el)}
              type="button"
              onClick={() => enter(p.slug, i)}
              className="js-plate group relative h-full max-h-[52vh] w-full max-w-[40rem] origin-center overflow-hidden rounded-sm text-left shadow-[0_26px_60px_-30px_rgba(4,8,26,.95)] ring-1 ring-brass/25 transition-[box-shadow,transform] duration-700 hover:-translate-y-1.5 hover:ring-brass/70 3xl:max-w-[46rem]"
            >
              {/* No aerial here: the site is what the development's own page opens with. The
                  index stays brand — the wordmark on deep navy over the survey grid, the
                  plate lifting to rose gold as it is chosen. */}
              <span className="plate-field absolute inset-0 transition-opacity duration-700 group-hover:opacity-90" />
              <span
                className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                style={{ background: 'radial-gradient(75% 60% at 50% 42%, rgba(172,124,89,.22), transparent 70%)' }}
              />

              <span className="relative flex h-full flex-col p-7 md:p-9">
                <span className="flex min-h-0 flex-1 items-center justify-center">
                  <img
                    src={p.logo}
                    alt={p.name}
                    className={`h-auto max-h-full transition-transform duration-700 ease-out group-hover:scale-[1.03] ${
                      p.slug === 'homestead' ? 'w-[min(24vw,320px)]' : 'w-[min(15vw,212px)]'
                    }`}
                  />
                </span>

                <span className="flex flex-col gap-3.5">
                  <span className="h-px w-14 bg-brass/70 transition-[width] duration-700 group-hover:w-24" />
                  <span className="flex items-baseline justify-between gap-5">
                    <span className="label-micro text-bone/60">{p.place} · {p.blurb}</span>
                    <span className="label-micro flex shrink-0 items-center gap-2.5 text-brass opacity-0 transition-opacity duration-500 group-hover:opacity-100 max-md:hidden">
                      View progress
                      <span className="h-px w-6 bg-brass" />
                    </span>
                  </span>
                </span>
              </span>
            </button>
        ))}
      </section>

      {/* the line the company closes on */}
      <section className="relative z-10 shrink-0 px-8 pb-9 text-center md:px-14 md:pb-11 3xl:pb-14">
        <h1 className="js-tag text-hero leading-[1.05]">
          {first}. <span className="text-brass">{second}</span>
        </h1>
        <p className="js-tag mt-3.5 text-body text-bone/60">Two developments in Mahim, flown by drone every quarter.</p>
      </section>

      <Brainwing tone="bone" />
    </main>
  );
}
