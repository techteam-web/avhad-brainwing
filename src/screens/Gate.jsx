import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Brainwing } from '../components/Brainwing';
import { TAGLINE, longDate } from '../data/projects';
import { ABOUT, NOTICE, RERA, RERA_SITE } from '../data/legal';
import lockup from '../assets/avhad-lockup.svg';
import skyline from '../assets/skyline.svg';

gsap.registerPlugin(useGSAP);

// The way in. The group announces itself and one button opens the progress record — the
// only thing on the page that looks as though it can be pressed. The regulator's details
// are there to be read, not chosen between, so they stand apart from it: a plate in the
// bottom corner of a wide screen, fine print along the foot of a phone. Each block appears
// on its own once src/data/legal.js has it; the about and the notice are not in yet.
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
          scrolls, and the notice can run long once it arrives. */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* m-auto, not justify-center: a centred flex child that outgrows its scroller has
            its top clipped beyond reach. On a wide screen the foot is kept free for the
            registrations, which lifts the centre a little; on a phone on its side they
            take the left, and this centres in what is left of the width. */}
        <div className="m-auto flex w-full max-w-[64rem] flex-col items-center px-6 py-10 text-center sm:px-10 md:px-14 md:pb-40 md:pt-14 short:py-6 short:pl-[calc(max(1rem,env(safe-area-inset-left))+20.5rem)] short:pr-6 3xl:px-20">
          <img
            src={lockup}
            alt="Avhad Real Estate Developers"
            className="js-rise h-20 w-auto brightness-0 invert sm:h-24 md:h-28 short:h-14 3xl:h-32"
          />

          {/* two deliberate lines, as the brochure sets it, rather than an accidental wrap */}
          <h1 className="js-rise mt-8 text-hero leading-[1.06] md:mt-10 short:mt-4 short:text-[1.75rem]">
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

          <button
            type="button"
            onClick={enter}
            className="js-rise label group mt-10 inline-flex w-full max-w-80 items-center justify-center gap-4 rounded-full bg-brass px-8 py-4 text-navy-deep shadow-[0_18px_40px_-18px_rgba(172,124,89,.8)] transition-colors duration-300 hover:bg-brass-lit sm:w-auto sm:max-w-none md:mt-12 md:px-10 md:py-4.5 short:mt-6 short:py-3.5"
          >
            Enter experience
            <span className="inline-block transition-transform duration-500 group-hover:translate-x-1.5">→</span>
          </button>

          {NOTICE && <p className="js-rise mt-10 max-w-[70ch] text-micro leading-relaxed text-bone/40">{NOTICE}</p>}
        </div>

        {RERA.length > 0 && <FinePrint />}
      </div>

      {RERA.length > 0 && <Plate />}

      <Brainwing tone="bone" />
    </main>
  );
}

// Wide screens, and phones on their side: one plate in the bottom-left corner, the two
// registrations in it one above the other. The link to the regulator is the only thing
// in it that goes anywhere, and it says so with its arrow.
function Plate() {
  return (
    <aside
      aria-label="MahaRERA registrations"
      className="js-rise absolute bottom-8 left-8 z-20 hidden w-86 rounded-2xl border border-bone/12 bg-navy-deep/80 p-5 shadow-[0_24px_60px_-28px_rgba(4,8,26,.95)] md:block short:bottom-3 short:left-[max(1rem,env(safe-area-inset-left))] short:block short:w-78 short:p-4 3xl:bottom-10 3xl:left-10"
    >
      <div className="flex items-center gap-3">
        <p className="label-micro text-brass">Maharashtra RERA</p>
        <span className="h-px flex-1 bg-bone/15" />
      </div>
      <ul className="mt-4 divide-y divide-bone/10 short:mt-3">
        {RERA.map((r) => (
          <li key={r.number} className="flex items-center gap-4 py-3.5 first:pt-0 short:py-2.5">
            {/* the certificate's own code, on its white ground so a camera can read it */}
            <img src={r.qr} alt={`MahaRERA QR code for ${r.project}`} className="size-17 shrink-0 rounded-md short:size-14" />
            <Registration r={r} />
          </li>
        ))}
      </ul>
      <Regulator className="mt-1.5" />
    </aside>
  );
}

// Phones held upright: fine print along the foot, under a titled rule, with no plate
// round it — nothing here is a card to tap, so nothing is drawn like one.
function FinePrint() {
  return (
    <aside
      aria-label="MahaRERA registrations"
      className="js-rise shrink-0 bg-[linear-gradient(to_top,rgba(9,17,50,.9),rgba(9,17,50,.7)_65%,transparent)] px-6 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+2.5rem)] pt-8 md:hidden short:hidden"
    >
      <div className="mx-auto max-w-84">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-bone/15" />
          <p className="label-micro text-bone/55">Maharashtra RERA</p>
          <span className="h-px flex-1 bg-bone/15" />
        </div>
        <ul className="mt-4 flex flex-col gap-3">
          {RERA.map((r) => (
            <li key={r.number} className="flex items-center gap-3.5">
              <img src={r.qr} alt={`MahaRERA QR code for ${r.project}`} className="size-13 shrink-0 rounded" />
              <Registration r={r} />
            </li>
          ))}
        </ul>
        <Regulator className="mt-4 justify-center" />
      </div>
    </aside>
  );
}

function Registration({ r }) {
  return (
    <div className="min-w-0 text-left">
      <p className="label-micro text-bone/90">{r.project}</p>
      <p className="label-micro mt-1 text-brass-lit/90">{r.number}</p>
      {r.validUntil && <p className="label-micro mt-1 text-bone/45">Valid until {longDate(r.validUntil)}</p>}
    </div>
  );
}

function Regulator({ className = '' }) {
  return (
    <a
      href={RERA_SITE}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-2.5 py-1.5 text-micro font-normal text-bone/80 transition-colors duration-300 hover:text-bone ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {RERA_SITE.replace('https://', '')}
    </a>
  );
}
