// Trim a trained splat down to the site, and cut the needles off it.
//
//   node scripts/despike-splat.mjs <in.ply> <out.ply> [--radius 3.5] [--max-scale 0.25]
//
// Two things spoil a splat trained from a single orbit:
//
//   The spikes. Where a surface was seen from only a couple of frames, training has no
//   parallax to pin it down and stretches a Gaussian into a long needle instead. They are
//   not faint — raising the alpha threshold does nothing — but they are enormously
//   elongated, so they can be cut by size. 3DGS stores scale as a logarithm, hence exp().
//
//   The neighbourhood. Most of a trained scene is buildings around the plot, seen badly
//   and reconstructed worse. Cropping to a radius around the site drops them, which
//   sharpens what is left and shrinks the file at the same time.
//
// The header is parsed rather than assumed: Brush writes its properties in its own order.

import { readFileSync, writeFileSync } from 'node:fs';

const [input, output, ...rest] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: despike-splat.mjs <in.ply> <out.ply> [--radius R] [--max-scale S] [--center x,y,z]');
  process.exit(1);
}
const arg = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? fallback : rest[i + 1];
};

const radius = Number(arg('radius', 3.5));
const maxScale = Number(arg('max-scale', 0.25));
const centre = arg('center', '')
  ? arg('center', '').split(',').map(Number)
  : JSON.parse(readFileSync('.cache/splat/scene.json', 'utf8')).center;

const buf = readFileSync(input);
const headerEnd = buf.indexOf('end_header\n') + 'end_header\n'.length;
const header = buf.subarray(0, headerEnd).toString('latin1');
const props = [...header.matchAll(/property float (\S+)/g)].map((m) => m[1]);
const count = Number(header.match(/element vertex (\d+)/)[1]);
const stride = props.length * 4;
const at = (name) => props.indexOf(name);
const [ix, iy, iz] = ['x', 'y', 'z'].map(at);
const scales = ['scale_0', 'scale_1', 'scale_2'].map(at);

if (buf.length - headerEnd !== count * stride) {
  console.error(`unexpected body size: ${buf.length - headerEnd} bytes for ${count} × ${stride}`);
  process.exit(1);
}

const keep = [];
let farOut = 0;
let needles = 0;
for (let i = 0; i < count; i++) {
  const o = headerEnd + i * stride;
  const x = buf.readFloatLE(o + ix * 4) - centre[0];
  const y = buf.readFloatLE(o + iy * 4) - centre[1];
  const z = buf.readFloatLE(o + iz * 4) - centre[2];
  if (Math.hypot(x, y, z) > radius) {
    farOut++;
    continue;
  }
  const biggest = Math.max(...scales.map((s) => Math.exp(buf.readFloatLE(o + s * 4))));
  if (biggest > maxScale) {
    needles++;
    continue;
  }
  keep.push(o);
}

const body = Buffer.allocUnsafe(keep.length * stride);
keep.forEach((o, n) => buf.copy(body, n * stride, o, o + stride));
const newHeader = header.replace(/element vertex \d+/, `element vertex ${keep.length}`);
writeFileSync(output, Buffer.concat([Buffer.from(newHeader, 'latin1'), body]));

const pct = (n) => `${((n / count) * 100).toFixed(1)}%`;
console.log(`  ${input} → ${output}`);
console.log(`  kept ${keep.length} of ${count} (${pct(keep.length)}) · outside ${radius}: ${farOut} (${pct(farOut)}) · needles over ${maxScale}: ${needles} (${pct(needles)})`);
