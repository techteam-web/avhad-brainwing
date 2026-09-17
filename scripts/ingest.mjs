// Site captures in, web assets out.
//
//   npm run assets            everything
//   npm run assets -- orbit   only the orbit frames
//   npm run assets -- stills  only the stills
//   npm run assets -- orbit bayline   one project, one kind
//
// Two kinds of asset per capture:
//   ORBIT — one drone orbit of the plot, cut into a numbered frame sequence. The page
//   scrubs those frames as you drag, which is why it is frames and not a <video>: a video
//   seeks in fits and starts, a decoded frame sequence tracks the finger exactly.
//   STILLS — the individual photographs, tagged with the compass point they were taken
//   from (the DJI XMP carries gimbal yaw and pitch), so the gallery can offer Top, North,
//   East, South and West without anyone tagging anything by hand.
//
// Every capture is dated, and the app's timeline is built from those dates: drop the next
// quarter's folder in, add it to CAPTURES below, run this again, and the new date appears.
//
// Output: public/assets/<project>/<date>/… + src/data/assets.json

import { mkdir, readdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public/assets');
const TMP = join(ROOT, '.cache/frames');
const MANIFEST = join(ROOT, 'src/data/assets.json');

const CAPTURES = [
  {
    slug: 'homestead',
    date: '2026-09-10',
    dir: '/Users/Arsalan/Downloads/Avhad Homestead mahim',
    orbit: 'orbit_loop.mp4',
  },
  {
    slug: 'bayline',
    date: '2026-09-10',
    dir: '/Users/Arsalan/Downloads/Avhad Bayline Residences',
    orbit: '/Users/Arsalan/Downloads/Avhad Bayline Residences Mahim.mp4',
  },
];

const ORBIT_FRAMES = 96; // one frame every ~3.8° of a full turn
// Orbit frames are compressed harder than stills: 96 of them ship as one sequence, and at
// 25 frames a second of drag nobody reads a single frame closely.
const ORBIT_WIDTHS = [{ w: 640, q: 60 }, { w: 1280, q: 56 }];
const STILL_WIDTHS = [{ w: 640, q: 72 }, { w: 1280, q: 70 }, { w: 1920, q: 68 }];

const kB = (n) => `${(n / 1024).toFixed(0)} kB`;
const MB = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

// Where the drone was, from where the camera looked: a camera facing east sat west of the
// plot. Straight down is the top view.
function viewOf({ pitch, yaw }) {
  if (pitch === null || pitch <= -85) return 'top';
  const from = ((((yaw ?? 0) + 180) % 360) + 360) % 360;
  return ['north', 'east', 'south', 'west'][Math.round(from / 90) % 4];
}

function telemetry(buf) {
  const head = buf.subarray(0, 4_000_000).toString('latin1');
  const read = (tag) => {
    const m = head.match(new RegExp(`${tag}="([^"]+)"`));
    return m ? Number.parseFloat(m[1]) : null;
  };
  return { altitude: read('RelativeAltitude'), pitch: read('GimbalPitchDegree'), yaw: read('GimbalYawDegree') };
}

const time = (file) => {
  const m = file.match(/DJI_\d{8}(\d{2})(\d{2})(\d{2})/);
  return m ? `${m[1]}:${m[2]}:${m[3]}` : null;
};

async function ladder(input, dest, name, widths) {
  let bytes = 0;
  await Promise.all(
    widths.map(async ({ w, q }) => {
      const file = join(dest, `${name}-${w}.webp`);
      await sharp(input).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: q, effort: 5, smartSubsample: true }).toFile(file);
      bytes += (await stat(file)).size;
    }),
  );
  return bytes;
}

async function stills(capture) {
  const dest = join(OUT, capture.slug, capture.date, 'stills');
  await mkdir(dest, { recursive: true });
  const files = (await readdir(capture.dir)).filter((f) => /\.jpe?g$/i.test(f)).sort();
  const views = {};
  let bytes = 0;

  for (const [i, file] of files.entries()) {
    const buf = await readFile(join(capture.dir, file));
    const meta = await sharp(buf).metadata();
    const tel = telemetry(buf);
    const view = viewOf(tel);
    const n = String(i + 1).padStart(2, '0');
    bytes += await ladder(buf, dest, n, STILL_WIDTHS);
    const lqip = await sharp(buf).resize({ width: 20 }).webp({ quality: 40 }).toBuffer();
    (views[view] ??= []).push({
      id: `${capture.slug}-${capture.date}-${n}`,
      src: `/assets/${capture.slug}/${capture.date}/stills/${n}`,
      width: meta.width,
      height: meta.height,
      time: time(file),
      altitude: tel.altitude,
      lqip: `data:image/webp;base64,${lqip.toString('base64')}`,
    });
  }

  // Highest first inside a view: the wide establishing shot leads, details follow.
  for (const list of Object.values(views)) list.sort((a, b) => (b.altitude ?? 0) - (a.altitude ?? 0));
  console.log(`  ${capture.slug} ${capture.date} stills: ${files.length} → ${MB(bytes)}  [${Object.entries(views).map(([k, v]) => `${k} ${v.length}`).join(', ')}]`);
  return views;
}

async function orbit(capture) {
  if (!capture.orbit) return null;
  // an orbit may sit beside the stills or anywhere else on disk
  const src = capture.orbit.startsWith("/") ? capture.orbit : join(capture.dir, capture.orbit);
  const dest = join(OUT, capture.slug, capture.date, 'orbit');
  const tmp = join(TMP, `${capture.slug}-${capture.date}`);
  await mkdir(dest, { recursive: true });
  await mkdir(tmp, { recursive: true });

  const probe = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', src]);
  const [width, height, duration] = probe.stdout.trim().split('\n').map(Number);

  // Evenly spaced across the whole orbit, at full height, as quality JPEGs first.
  await run('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', `fps=${ORBIT_FRAMES / duration},scale=1920:-2`, '-q:v', '2', join(tmp, '%03d.jpg')]);
  const frames = (await readdir(tmp)).filter((f) => f.endsWith('.jpg')).sort().slice(0, ORBIT_FRAMES);

  let bytes = 0;
  for (const [i, f] of frames.entries()) {
    bytes += await ladder(join(tmp, f), dest, String(i).padStart(3, '0'), ORBIT_WIDTHS);
  }
  const lqip = await sharp(join(tmp, frames[0])).resize({ width: 20 }).webp({ quality: 40 }).toBuffer();
  console.log(`  ${capture.slug} ${capture.date} orbit: ${frames.length} frames → ${MB(bytes)} (${kB(bytes / frames.length)}/frame)`);

  return {
    frames: frames.length,
    src: `/assets/${capture.slug}/${capture.date}/orbit`,
    width,
    height,
    duration,
    lqip: `data:image/webp;base64,${lqip.toString('base64')}`,
  };
}

const only = process.argv[2];
const onlySlug = process.argv[3]; // optional second argument: rebuild one project only
// A partial run keeps what it did not rebuild: the manifest is merged, never replaced.
const previous = only || onlySlug ? JSON.parse(await readFile(MANIFEST, 'utf8').catch(() => '{}')) : {};
const manifest = {};
for (const capture of CAPTURES) {
  const was = (previous[capture.slug] ?? []).find((c) => c.date === capture.date) ?? {};
  if (onlySlug && capture.slug !== onlySlug) {
    // not this project's turn: carry its manifest entry through untouched
    if (was.date) (manifest[capture.slug] ??= []).push(was);
    continue;
  }
  const dest = join(OUT, capture.slug, capture.date);
  if (!only) await rm(dest, { recursive: true, force: true });
  const entry = { ...was, date: capture.date };
  if (only !== 'orbit') entry.views = await stills(capture);
  if (only !== 'stills') entry.orbit = await orbit(capture);
  (manifest[capture.slug] ??= []).push(entry);
}
await mkdir(dirname(MANIFEST), { recursive: true });
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`  manifest → ${MANIFEST}`);
