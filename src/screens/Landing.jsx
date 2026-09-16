import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { PROJECTS, coverOf, longDate } from '../data/projects';
import { srcAt } from '../lib/images';
import logo from '../assets/avhad-logo.svg';

gsap.registerPlugin(useGSAP);

export function Landing() {
  const root = useRef(null);
  const navigate = useNavigate();

  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from('.js-head', { y: -16, opacity: 0, duration: 0.9, stagger: 0.08 })
        .from('.js-card', { y: 28, opacity: 0, duration: 1.1, stagger: 0.12 }, 0.15)
        .from('.js-foot', { opacity: 0, duration: 0.8 }, 0.6);
    },
    { scope: root },
  );

  const latest = PROJECTS[0].captures.find((c) => !c.upcoming)?.date;

  return (
    <main ref={root} className="flex h-dvh w-full flex-col bg-paper px-5 py-5 md:px-10 md:py-8 3xl:px-16">
      <header className="flex items-center justify-between">
        <img src={logo} alt="Avhad" className="js-head h-9 w-auto md:h-11 3xl:h-14" />
        <p className="js-head label text-muted">Construction progress</p>
      </header>

      <div className="mt-5 grid min-h-0 flex-1 gap-4 md:mt-8 md:grid-cols-2 md:gap-6">
        {PROJECTS.map((p) => {
          const cover = coverOf(p);
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => navigate(`/${p.slug}`)}
              className="js-card group relative min-h-0 overflow-hidden rounded-2xl bg-navy text-left ring-1 ring-line transition-shadow duration-500 hover:shadow-[0_24px_60px_-28px_rgba(27,34,78,.55)]"
            >
              {cover && (
                <img
                  src={srcAt(cover, 1280)}
                  alt=""
                  className="absolute inset-0 h-full w-full scale-[1.04] object-cover opacity-90 transition-transform duration-[1.6s] ease-out group-hover:scale-100"
                />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-navy via-navy/45 to-navy/5" />

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-paper md:p-7">
                <div>
                  <p className="label text-paper/70">{p.place}</p>
                  <h2 className="mt-1.5 text-hero font-semibold leading-[1.05] tracking-tight">{p.name}</h2>
                  <p className="mt-1 text-label text-paper/75">{p.blurb}</p>
                </div>
                <span className="mb-1 grid size-11 shrink-0 place-items-center rounded-full border border-paper/40 text-paper transition duration-500 group-hover:border-paper group-hover:bg-paper group-hover:text-navy md:size-12">
                  →
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <footer className="js-foot mt-4 flex items-center justify-between md:mt-6">
        <p className="label text-muted">Latest capture · {latest ? longDate(latest) : '—'}</p>
        <p className="label text-muted max-mob:hidden">Drag to explore</p>
      </footer>
    </main>
  );
}
