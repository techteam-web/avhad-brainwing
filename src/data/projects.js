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

// The arcs of each orbit worth showing: the stretches where the plot is clear of the
// towers standing in front of it. The numbers are frames of that capture's own sequence,
// each pair a first and a last, and they play one after another as the orbit is dragged —
// everything outside them is skipped. An empty list shows the whole turn.
const ORBIT_ARCS = {
  // Four arcs, one per reference pair, matched frame by frame to the stills chosen off the
  // page. The towers between them, which stand in front of the plot, are skipped.
  //
  // Found automatically first, by reading the middle of every frame — open ground means the
  // plot is visible, a flat bright wall means a tower is in the way. That pass gave
  // [[158, 486], [780, 957], [1098, 1297], [1670, 1869]], which is what to go back to if
  // the matched arcs below read worse.
  homestead: { '2026-09-10': [[158, 486], [780, 957], [1098, 1297], [1670, 1869]] },
  bayline: { '2026-09-10': [] },
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
  const shot = (assets[slug] ?? []).map((c) => ({
    ...c,
    upcoming: false,
    orbit: c.orbit ? { ...c.orbit, arcs: ORBIT_ARCS[slug]?.[c.date] ?? [] } : null,
  }));
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

// ONE photograph per compass point, and all five taken from as near the same distance as
// the flight allows, so switching between them reads as the camera swinging round the
// site rather than jumping in and out.
//
// Altitude alone is not that distance. The camera looks down at an angle, and DJI can
// shoot at 2x digital zoom — a 2x frame from 165 m looks like it was taken from 80 m. So
// each photo is measured by how far away it LOOKS: the line of sight to the ground,
// divided by the zoom.
const apparent = (p) => {
  const tilt = Math.abs(p.pitch ?? -90) * (Math.PI / 180);
  return (p.altitude ?? 0) / Math.max(Math.sin(tilt), 0.3) / (p.zoom ?? 1);
};

export function viewsOf(capture) {
  const present = VIEWS.filter((v) => capture.views?.[v.key]?.length);
  // Near-identical frames (a burst a few seconds apart) should not trade places over a
  // metre, so a later frame has to be clearly closer to win.
  const off = (p, target) => Math.abs(Math.log(apparent(p) / target));
  const pick = (list, target) => list.reduce((best, p) => (off(p, target) < off(best, target) - 0.01 ? p : best));

  // Try every photo's distance as the target and keep the set whose nearest and farthest
  // frames differ least — and when the extremes are fixed (one side only has far shots),
  // the one whose other frames sit closest to the middle of them.
  let chosen = null;
  let best = Infinity;
  for (const target of present.flatMap((v) => capture.views[v.key].map(apparent))) {
    const set = present.map((v) => pick(capture.views[v.key], target));
    const d = set.map(apparent);
    const mid = Math.sqrt(Math.max(...d) * Math.min(...d));
    const score = Math.log(Math.max(...d) / Math.min(...d)) + 0.25 * d.reduce((a, x) => a + Math.abs(Math.log(x / mid)), 0) / d.length;
    if (score < best - 1e-9) [best, chosen] = [score, set];
  }

  return present.map((v, i) => ({ ...v, photo: chosen[i], altitude: Math.round(chosen[i].altitude ?? 0) }));
}

