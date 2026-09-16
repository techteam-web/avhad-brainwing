import assets from './assets.json';

// Everything about a project that is not an asset. Captures themselves — their dates, the
// orbit and the stills grouped by compass view — come from assets.json, which
// scripts/ingest.mjs writes.
const META = {
  homestead: { name: 'Avadh Homestead', place: 'Mahim · Mumbai', blurb: 'Excavation and piling under way' },
  bayline: { name: 'Avadh Bayline', place: 'Mahim · Mumbai', blurb: 'Piling grid taking shape' },
};

// The site is flown every quarter. These are the dates already booked, shown on the
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

// The stills of one capture, in a fixed view order, skipping views with nothing in them.
export const viewsOf = (capture) => VIEWS.filter((v) => capture.views?.[v.key]?.length).map((v) => ({ ...v, photos: capture.views[v.key] }));

export const coverOf = (project) => {
  const capture = project.captures.find((c) => !c.upcoming);
  return capture?.views?.top?.[0] ?? Object.values(capture?.views ?? {})[0]?.[0] ?? null;
};
