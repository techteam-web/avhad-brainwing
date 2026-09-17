import logo from '/images/brainwing.webp';

// The maker's mark, bottom right on every screen. The size ramp is the one the hariko
// project uses for the same logo — it grows through the phone sizes, settles back once
// there is a real desktop viewport, then climbs again for kiosk displays.
//
// The artwork is flattened to a silhouette and tinted for whatever it sits on: ink on the
// paper index, bone over the photographs.
const TONE = {
  ink: 'brightness-0 opacity-35',
  bone: 'brightness-0 invert opacity-50 drop-shadow-[0_1px_10px_rgba(16,21,43,.8)]',
};

export function Brainwing({ tone = 'bone' }) {
  return (
    <img
      src={logo}
      alt="Brainwing"
      className={`pointer-events-none fixed bottom-3 right-4 z-9999 w-25
        sm:bottom-2 sm:right-4 sm:w-35
        md:bottom-2 md:right-5 md:w-40
        lg:bottom-1 lg:right-5 lg:w-24
        xl:bottom-1 xl:right-5 xl:w-25
        3xl:bottom-2 3xl:right-8 3xl:w-32
        4xl:bottom-3 4xl:right-10 4xl:w-40
        5xl:right-12 5xl:w-56
        ${TONE[tone]}`}
    />
  );
}
