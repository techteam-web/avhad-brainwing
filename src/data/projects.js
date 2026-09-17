import assets from './assets.json';

// Everything about a project that is not an asset. The captures themselves — their dates,
// the orbit, the 3D scene and the stills grouped by compass view — come from
// assets.json, which scripts/ingest.mjs writes.
// The order here is the order they appear on the index. Each development has its own
// wordmark from the brand pack: Homestead's is set in gold,
// Bayline's comes in white and gold-foil. `logo` is the one to use on the dark ground.
const META = {
  bayline: {
    name: 'Avhad Bayline Residences',
    place: 'Mahim · Mumbai',
    blurb: 'Piling under way',
    logo: '/images/bayline-white.png',
    logoGold: '/images/bayline-gold.png',
  },
  homestead: {
    name: 'Avhad Homestead',
    place: 'Mahim · Mumbai',
    blurb: 'Excavation under way',
    logo: '/images/homestead-gold.png',
    logoGold: '/images/homestead-gold.png',
  },
};

// From the brand guidelines.
export const TAGLINE = 'Building Landmarks. Creating Legacies.';

// The site is flown every quarter. These dates are already booked, and sit on the
// timeline as upcoming until their folder arrives and ingest fills them in.
const PLANNED = ['2026-12-10', '2027-03-10', '2027-06-10'];

export const VIEWS = [
  { key: 'top', label: 'Top' },
  { key: 'north', label: 'North' },
  { key: 'east', label: 'East' },
  { key: 'south', label: 'South' },
  { key: 'west', label: 'West' },
];

export const PROJECTS = Object.entries(META).map(([slug, meta]) => {
  const shot = (assets[slug] ?? []).map((c) => ({ ...c, upcoming: false }));
  const planned = PLANNED.filter((date) => !shot.some((c) => c.date === date)).map((date) => ({ date, upcoming: true, views: {}, orbit: null }));
  return { slug, ...meta, captures: [...shot, ...planned].sort((a, b) => a.date.localeCompare(b.date)) };
});

export const getProject = (slug) => PROJECTS.find((p) => p.slug === slug);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthOf = (date) => MONTHS[Number(date.slice(5, 7)) - 1];
export const yearOf = (date) => date.slice(0, 4);
export const longDate = (date) => `${Number(date.slice(8, 10))} ${monthOf(date)} ${yearOf(date)}`;
// The full month, for the masthead: a capture is a month's progress, not a day's.
const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthYear = (date) => `${FULL[Number(date.slice(5, 7)) - 1]} ${yearOf(date)}`;

// ONE photograph per compass point, not a pile of them — and the four sides are picked at
// as near the same altitude as the capture allows, so switching between them reads as the
// camera swinging round the site rather than jumping up and down.
//
// The flight decides how well that works. September 2026 at Homestead was flown high on
// the north and east sides (165 m) and much lower on the south and west (108–115 m), so
// those four cannot match; Bayline's agree within about 16 m. Holding one altitude per
// side on future flights is what would make this exact.
const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];

export function viewsOf(capture) {
  const sides = VIEWS.filter((v) => v.key !== 'top' && capture.views?.[v.key]?.length);
  // Aim for the altitude the sides agree on best: the median of each side's highest shot.
  const target = sides.length ? median(sides.map((v) => Math.max(...capture.views[v.key].map((p) => p.altitude ?? 0)))) : 0;

  return VIEWS.filter((v) => capture.views?.[v.key]?.length).map((v) => {
    const photos = capture.views[v.key];
    const photo =
      v.key === 'top'
        ? photos.reduce((best, p) => ((p.altitude ?? 0) > (best.altitude ?? 0) ? p : best)) // the widest overhead
        : photos.reduce((best, p) => (Math.abs((p.altitude ?? 0) - target) < Math.abs((best.altitude ?? 0) - target) ? p : best));
    return { ...v, photo, altitude: Math.round(photo.altitude ?? 0) };
  });
}

export const coverOf = (project) => {
  const capture = project.captures.find((c) => !c.upcoming);
  return capture ? (viewsOf(capture)[0]?.photo ?? null) : null;
};
