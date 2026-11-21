// Renders public/og.png (1200x630) and the PNG app icons from tools/og.html and public/icon.svg.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(os.homedir(), '.cache/ms-playwright');
const dir = fs.readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse()[0];
const browser = await chromium.launch({ executablePath: path.join(root, dir, 'chrome-linux64/chrome') });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto('file://' + path.join(here, 'og.html'));
await page.screenshot({ path: path.join(here, '../public/og.png') });
for (const size of [180, 512]) {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  await p.goto('file://' + path.join(here, '../public/icon.svg'));
  await p.screenshot({ path: path.join(here, `../public/icon-${size}.png`), omitBackground: true });
}
await browser.close();
console.log('rendered');
