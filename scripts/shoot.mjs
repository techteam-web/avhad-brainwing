// Drive the app and photograph it, mid-interaction included.
//
//   node scripts/shoot.mjs '[{"path":"/","name":"landing","steps":[{"wait":1500},{"shot":"a"}]}]'
//
// Steps: {wait} {shot} {key} {click:[x,y]} {drag:[x1,y1,x2,y2]} {tap:"sel"} {hover:"sel"} {eval:"js"}
// Needs the dev server (npm run dev). Console errors print at the end.

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const URL = process.env.URL ?? 'http://localhost:5190';
const OUT = process.env.OUT ?? '.cache/shots';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];

for (const job of JSON.parse(process.argv[2])) {
  const [width, height] = (job.vp ?? '1920x1080').split('x').map(Number);
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(20000);
  page.on('console', (m) => m.type() === 'error' && errors.push(`${job.name}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${job.name}: ${e.message}`));
  await page.goto(URL + job.path);
  const t0 = Date.now();
  for (const s of job.steps ?? []) {
    if (process.env.TRACE) console.log(`  ${((Date.now() - t0) / 1000).toFixed(1)}s ${JSON.stringify(s)}`);
    if (s.wait) await page.waitForTimeout(s.wait);
    if (s.key) await page.keyboard.press(s.key);
    if (s.click) await page.mouse.click(...s.click);
    if (s.hover) await page.hover(s.hover);
    if (s.tap) await page.click(s.tap, { force: true });
    if (s.drag) {
      const [x1, y1, x2, y2] = s.drag;
      await page.mouse.move(x1, y1);
      await page.mouse.down();
      await page.mouse.move(x2, y2, { steps: 20 });
      await page.mouse.up();
    }
    if (s.eval) console.log(job.name, JSON.stringify(await page.evaluate(s.eval)));
    if (s.shot) {
      const file = `${OUT}/${job.name}-${s.shot}.png`;
      await page.screenshot({ path: file });
      console.log(file);
    }
  }
  await page.close();
}

await browser.close();
if (errors.length) console.log(`\nERRORS\n${[...new Set(errors)].join('\n')}`);
