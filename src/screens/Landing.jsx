import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Brainwing } from '../components/Brainwing';
import { PROJECTS, TAGLINE, coverOf, monthYear } from '../data/projects';
import { srcAt } from '../lib/images';
import lockup from '../assets/avhad-lockup.svg';
import skyline from '../assets/skyline.svg';

gsap.registerPlugin(useGSAP);

// The index, on a centre axis: the lockup at the head of the page, the two developments
// side by side beneath it as the thing you came to choose between, and the company's line
// closing the page along the foot. The brand's skyline stands on the left and rose gold
// light falls in from the right — the two halves of the palette, not a mirror.
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
        .fromTo('.js-glow', { opacity: 0 }, { opacity: 1, duration: 2.2, ease: 'sine.out', clearProps: 'opacity' }, 0)
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
      .to('.js-tag, .js-mast, .js-sky, .js-glow', { opacity: 0, duration: 0.45, ease: 'power2.in', stagger: 0.04 }, 0)
      .to(chosen, { scale: 1.06, duration: 0.85, ease: 'expo.inOut' }, 0.05);
  };

  return (
    <main ref={root} className="brand-field relative flex h-dvh w-full flex-col overflow-clip text-bone">
      <span className="grain-layer z-30" />

      {/* the brand's own skyline stands on the left; the right is lit rather than mirrored */}
      <img src={skyline} alt="" className="js-sky pointer-events-none absolute -left-[6%] bottom-0 z-0 h-[62vh] w-auto md:-left-[3%] md:h-[68vh] 3xl:h-[72vh]" />

      {/* rose gold, the second colour of the palette, as light coming in from the right */}
      <span
        className="js-glow pointer-events-none absolute -right-[16%] top-[-10%] z-0 h-[120vh] w-[62vw]"
        style={{ background: 'radial-gradient(48% 44% at 66% 44%, rgba(214,170,128,.44) 0%, rgba(200,154,115,.24) 38%, rgba(172,124,89,.08) 62%, rgba(172,124,89,0) 78%)' }}
      />
      <span
        className="js-glow pointer-events-none absolute inset-y-0 right-0 z-0 w-[34vw]"
        style={{ background: 'linear-gradient(to left, rgba(200,154,115,.22) 0%, rgba(172,124,89,.07) 48%, rgba(172,124,89,0) 100%)' }}
      />
      <span
        className="js-glow pointer-events-none absolute inset-y-0 right-0 z-0 w-px"
        style={{ background: 'linear-gradient(to bottom, rgba(172,124,89,0) 0%, rgba(214,170,128,.75) 44%, rgba(172,124,89,.15) 100%)' }}
      />

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
        {PROJECTS.map((p, i) => {
          const cover = coverOf(p);
          return (
            <button
              key={p.slug}
              ref={(el) => (plates.current[i] = el)}
              type="button"
              onClick={() => enter(p.slug, i)}
              className="js-plate group relative h-full max-h-[56vh] w-full max-w-[40rem] origin-center overflow-hidden text-left ring-1 ring-bone/15 transition-[box-shadow,transform] duration-700 hover:-translate-y-1.5 hover:ring-brass/70 3xl:max-w-[46rem]"
            >
              {cover && (
                <img
                  src={srcAt(cover, 1280)}
                  alt=""
                  className="absolute inset-0 h-full w-full scale-105 object-cover transition-transform duration-[1800ms] ease-out group-hover:scale-100"
                />
              )}
              <span className="absolute inset-0 bg-linear-to-t from-ink via-ink/70 to-ink/15 transition-opacity duration-700 group-hover:opacity-90" />

              <span className="relative flex h-full flex-col justify-end gap-3.5 p-7 md:p-9">
                <img
                  src={p.logo}
                  alt={p.name}
                  className={`h-auto ${p.slug === 'homestead' ? 'w-[min(20vw,272px)]' : 'w-[min(10vw,148px)]'}`}
                />
                <span className="h-px w-14 bg-brass/70 transition-[width] duration-700 group-hover:w-24" />
                <span className="flex items-baseline justify-between gap-5">
                  <span className="label-micro text-bone/60">{p.place} · {p.blurb}</span>
                  <span className="label-micro flex shrink-0 items-center gap-2.5 text-brass opacity-0 transition-opacity duration-500 group-hover:opacity-100 max-md:hidden">
                    View progress
                    <span className="h-px w-6 bg-brass" />
                  </span>
                </span>
              </span>
            </button>
          );
        })}
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
