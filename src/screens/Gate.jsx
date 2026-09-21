import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Brainwing } from '../components/Brainwing';
import { TAGLINE } from '../data/projects';
import { ABOUT, NOTICE, RERA } from '../data/legal';
import lockup from '../assets/avhad-lockup.svg';
import skyline from '../assets/skyline.svg';

gsap.registerPlugin(useGSAP);

// The way in. The group announces itself, the regulator's details sit under it, and one
// button opens the progress record. Until that copy is supplied the page is the brand and
// the button — every block below appears on its own once src/data/legal.js has it.
export function Gate() {
  const root = useRef(null);
  const navigate = useNavigate();
  const leaving = useRef(false);
  const [first, second] = TAGLINE.split('. ');

  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .fromTo('.js-sky', { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 1.7, clearProps: 'opacity,transform' })
        .fromTo('.js-rise', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.12, clearProps: 'opacity,transform' }, 0.2);
    },
    { scope: root },
  );

  const enter = () => {
    if (leaving.current) return;
    leaving.current = true;
    gsap
      .timeline({ onComplete: () => navigate('/developments') })
      .to('.js-rise', { opacity: 0, y: -16, duration: 0.45, ease: 'power2.in', stagger: 0.05 })
      .to('.js-sky', { opacity: 0, duration: 0.5, ease: 'power2.in' }, 0);
  };

  return (
    <main ref={root} className="brand-field relative flex h-dvh w-full flex-col overflow-clip text-bone">
      <span className="grain-layer z-30" />

      <img
        src={skyline}
        alt=""
        className="js-sky pointer-events-none absolute -left-[14%] bottom-0 z-0 h-[42vh] w-auto opacity-60 sm:-left-[10%] sm:h-[52vh] md:-left-[3%] md:h-[66vh] md:opacity-100 3xl:h-[72vh]"
      />

      {/* The content scrolls within the page rather than the page itself: the app never
          scrolls, and the registrations and the notice can run long once they arrive. */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-10 text-center sm:px-10 md:px-14 md:py-14 md:pb-20 3xl:px-20">
        {/* m-auto, not justify-center: a centred flex child that outgrows its scroller has
            its top clipped beyond reach, and the copy below will outgrow a phone. */}
        <div className="m-auto flex w-full max-w-[64rem] flex-col items-center">
          <img
            src={lockup}
            alt="Avhad Real Estate Developers"
            className="js-rise h-20 w-auto brightness-0 invert sm:h-24 md:h-28 3xl:h-32"
          />

          {/* two deliberate lines, as the brochure sets it, rather than an accidental wrap */}
          <h1 className="js-rise mt-8 text-hero leading-[1.06] md:mt-10">
            {first}.
            <span className="mt-1 block text-brass">{second}</span>
          </h1>

          {ABOUT.length > 0 && (
            <div className="js-rise mt-7 flex max-w-[58ch] flex-col gap-4 text-body text-bone/65 md:mt-9">
              {ABOUT.map((para) => (
                <p key={para.slice(0, 32)}>{para}</p>
              ))}
            </div>
          )}

          {RERA.length > 0 && (
            <section className="js-rise mt-9 w-full md:mt-12">
              <p className="label-micro text-brass">Maharashtra RERA</p>
              <span className="mx-auto mt-4 block h-px w-14 bg-brass/40" />
              <ul className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center sm:gap-4">
                {RERA.map((r) => (
                  <li key={r.number} className="panel flex-1 rounded-2xl px-6 py-5 text-left sm:max-w-[22rem]">
                    <p className="label text-bone">{r.project}</p>
                    <p className="label-micro mt-2 text-brass-lit">{r.number}</p>
                    {r.authority && <p className="label-micro mt-2 text-bone/45">{r.authority}</p>}
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="label-micro mt-3 inline-flex items-center gap-2 text-bone/70 transition-colors hover:text-brass-lit"
                      >
                        Verify
                        <span className="h-px w-5 bg-current" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <button
            type="button"
            onClick={enter}
            className="js-rise label group mt-10 inline-flex items-center gap-4 rounded-full bg-brass px-8 py-4 text-navy-deep transition-colors duration-300 hover:bg-brass-lit md:mt-14 md:px-10 md:py-4.5"
          >
            Enter experience
            <span className="inline-block transition-transform duration-500 group-hover:translate-x-1.5">→</span>
          </button>

          {NOTICE && <p className="js-rise mt-10 max-w-[70ch] text-micro leading-relaxed text-bone/40">{NOTICE}</p>}
        </div>
      </div>

      <Brainwing tone="bone" />
    </main>
  );
}
