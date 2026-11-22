// Real product screenshots for the GitHub Pages product page (docs/screens/).
// Creates an example family circle on a LOCAL dev server, shoots phone and desktop views, then deletes it.
// Usage: BASE=http://127.0.0.1:18931 node tools/screens.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.BASE || 'http://127.0.0.1:18931';
if (!/127\.0\.0\.1|localhost/.test(BASE)) throw new Error('run against a local server only');
const OUT = 'docs/screens';
fs.mkdirSync(OUT, { recursive: true });
const root = path.join(os.homedir(), '.cache/ms-playwright');
const dir = fs.readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse()[0];
const browser = await chromium.launch({ executablePath: path.join(root, dir, 'chrome-linux64/chrome') });

const tok = (n) => ('demo-token-' + n).padEnd(32, 'x');
const api = (p, body, t, method = 'POST') => fetch(`${BASE}/api/${p}`, { method, headers: { 'content-type': 'application/json', 'x-token': t }, body: body && JSON.stringify(body) }).then((r) => r.json());
const now = new Date();
const at = (add) => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + add); return { day: d.getDate(), month: d.getMonth() + 1 }; };
const { id } = await api('circles', { name: 'The Smiths', person: { name: 'Emma', ...at(9), year: 1991, showAge: true } }, tok(0));
const people = [['Grandma Rose', 2, 1946, true], ['Leo', 5, 2018, true], ['Uncle Tom', 23, null, false], ['Aunt Kate', 41, 1975, false], ['Sam', 80, 2015, true], ['Grandpa Joe', 130, 1944, true], ['Lily', 200, 2021, true]];
for (const [i, [name, add, year, showAge]] of people.entries()) await api(`circles/${id}/members`, { name, ...at(add), year, showAge }, tok(i + 1));

const shoot = async (opts, url, file, fn) => {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  if (fn) await page.addInitScript(fn.script, fn.arg);
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  if (fn && fn.after) await fn.after(page);
  await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 82 });
  await ctx.close();
};
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
// Phone: Emma (the organiser) looking at the list
const asEmma = { script: ([cid, t]) => localStorage.setItem('bc:t:' + cid, t), arg: [id, tok(0)] };
await shoot(PHONE, `${BASE}/c/${id}`, 'phone-list.jpg', { ...asEmma, after: (p) => p.evaluate(() => document.querySelector('#listCard').scrollIntoView()) });
await shoot(PHONE, `${BASE}/c/${id}`, 'phone-circle.jpg', asEmma);
// Phone: a new relative opening the link
await shoot(PHONE, `${BASE}/c/${id}`, 'phone-join.jpg');

await api(`circles/${id}`, null, tok(0), 'DELETE');
await browser.close();
console.log('screens written to', OUT);
