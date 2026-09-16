// Tell the splat viewer how to frame a scene it knows nothing about.
//
//   node scripts/splat-scene.mjs <colmap work dir> <project-slug> <capture-date>
//
// A reconstruction carries no notion of up, of scale, or of what the subject is: its axes
// are wherever the solve happened to put them. Three numbers fix that, and all three come
// out of the camera poses rather than being guessed:
//
//   up      averaged from the cameras — each one's "down" in image space is world up,
//           and on this footage it lands well off any world axis, which is why the
//           viewer's preset views are built on this vector instead of on X/Y/Z.
//   centre  the mean of the points nearest the orbit's own centre. The median over every
//           point is dragged off the plot by distant buildings, which is exactly the bug
//           that first made the viewer open pointing at empty sky.
//   radius  how far the drone flew from that centre, which sets the preset distances.
//
// Writes the result into the capture's `splat.scene` in src/data/assets.json.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [work, slug, date] = process.argv.slice(2);
if (!work || !slug || !date) {
  console.error('usage: splat-scene.mjs <colmap work dir> <project-slug> <capture-date>');
  process.exit(1);
}

const txt = join(work, 'txt');
if (!existsSync(join(txt, 'images.txt'))) {
  mkdirSync(txt, { recursive: true });
  execFileSync('colmap', ['model_converter', '--input_path', join(work, 'sparse/0'), '--output_path', txt, '--output_type', 'TXT']);
}

const lines = (file) => readFileSync(join(txt, file), 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));

// images.txt lists two lines per image; the first holds the pose as quaternion + translation.
const centers = [];
const ups = [];
const images = lines('images.txt');
for (let i = 0; i < images.length; i += 2) {
  const [qw, qx, qy, qz, tx, ty, tz] = images[i].trim().split(/\s+/).map(Number).slice(1, 8);
  const R = [
    [1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw)],
    [2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw)],
    [2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy)],
  ];
  // Camera centre is -Rᵀt; world up is the camera's -Y axis.
  centers.push([0, 1, 2].map((r) => -(R[0][r] * tx + R[1][r] * ty + R[2][r] * tz)));
  ups.push([0, 1, 2].map((r) => -R[1][r]));
}

const mean = (list, i) => list.reduce((s, v) => s + v[i], 0) / list.length;
const ringCentre = [0, 1, 2].map((i) => mean(centers, i));

const points = lines('points3D.txt').map((l) => l.trim().split(/\s+/).slice(1, 4).map(Number));
const spread = points.map((p) => Math.hypot(p[0] - ringCentre[0], p[1] - ringCentre[1], p[2] - ringCentre[2]));
const half = [...spread].sort((a, b) => a - b)[Math.floor(spread.length / 2)];
const near = points.filter((_, i) => spread[i] < half);

const centre = [0, 1, 2].map((i) => mean(near, i));
const rawUp = [0, 1, 2].map((i) => mean(ups, i));
const length = Math.hypot(...rawUp);
const radius = centers.reduce((s, c) => s + Math.hypot(c[0] - centre[0], c[1] - centre[1], c[2] - centre[2]), 0) / centers.length;

const round = (v) => +v.toFixed(3);
const scene = {
  center: centre.map(round),
  up: rawUp.map((v) => round(v / length)),
  camera: centers[0].map(round),
  radius: round(radius),
};

const manifestPath = 'src/data/assets.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const capture = (manifest[slug] ?? []).find((c) => c.date === date);
if (!capture) throw new Error(`no capture ${slug} ${date} in ${manifestPath} — run npm run assets first`);

capture.splat = {
  src: `/assets/${slug}/${date}/splat/site.ksplat`,
  light: `/assets/${slug}/${date}/splat/site-light.ksplat`,
  ...capture.splat,
  scene,
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`  ${slug} ${date} scene → ${JSON.stringify(scene)} (${centers.length} cameras, ${points.length} points)`);
