// End-to-end test in real Chromium. Separate browser contexts play separate people:
// Anna creates a circle on her phone, Ben, Cleo and Dan join from their own browsers,
// Ben adds his daughter, edits his entry, signs in on a second device with his personal link,
// then Anna (the organiser) renames, removes an entry and deletes the circle.
// Checks list order, hidden ages, permissions, the link preview text and the .ics feed.
// Screenshots at phone and desktop width go to shots/.
// Usage: BASE=http://127.0.0.1:18931 node tests/e2e/run.mjs
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.BASE || 'http://127.0.0.1:18931';
const SHOTS = process.env.SHOTS || 'shots';
fs.mkdirSync(SHOTS, { recursive: true });

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const root = path.join(os.homedir(), '.cache/ms-playwright');
  for (const d of fs.readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse()) {
    const p = path.join(root, d, 'chrome-linux64/chrome');
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { viewport: { width: 1280, height: 860 } };
const errors = [];
const browser = await chromium.launch({ executablePath: findChrome() });
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

async function person(label, opts, expected = []) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' && !expected.some((re) => re.test(m.text()))) errors.push(`${label}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('dialog', (d) => (d.type() === 'prompt' ? d.accept('Uni friends 2026') : d.accept()));
  return { label, ctx, page };
}
const shot = (p, name) => p.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true });
async function fillBirthday(page, prefix, { name, day, month, year, showAge }) {
  await page.fill(`#${prefix}Name`, name);
  await page.selectOption(`#${prefix}Month`, String(month));
  await page.selectOption(`#${prefix}Day`, String(day));
  await page.fill(`#${prefix}Year`, year ? String(year) : '');
  if (showAge) await page.check(`#${prefix}ShowAge`);
}
const names = (page) => page.$$eval('#list .row .name', (els) => els.map((e) => e.firstChild.textContent.trim()));

const now = new Date();
const today = { d: now.getDate(), m: now.getMonth() + 1 };
// A date about 10 days ahead, for "next birthday"
const soonDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10);
const soon = { d: soonDate.getDate(), m: soonDate.getMonth() + 1 };

let step = 'start';
let circleUrl;
try {
  step = 'landing';
  const desk = await person('desktop-visitor', DESKTOP);
  await desk.page.goto(BASE + '/');
  await shot(desk.page, 'desktop-landing');

  step = 'create';
  const anna = await person('Anna', PHONE);
  await anna.page.goto(BASE + '/');
  await shot(anna.page, 'phone-landing');
  await anna.page.click('#createBtn');
  assert.match(await anna.page.textContent('#createError'), /name/i);
  await anna.page.fill('#circleName', 'Uni friends');
  await anna.page.fill('#meName', 'Anna');
  await anna.page.click('#createBtn');
  assert.match(await anna.page.textContent('#createError'), /day and month/i);
  await fillBirthday(anna.page, 'me', { name: 'Anna', day: soon.d, month: soon.m, year: 1996, showAge: true });
  await anna.page.click('#createBtn');
  await anna.page.waitForURL(/\/c\/[A-Za-z0-9]{12}$/);
  await anna.page.waitForSelector('#shareCard:not([hidden])');
  circleUrl = anna.page.url();
  assert.match(await anna.page.textContent('#shareText'), new RegExp(circleUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(await anna.page.isVisible('#joinCard'), false, 'creator is not asked to join again');
  assert.match(await anna.page.textContent('#nextCard'), /Anna/);
  assert.match(await anna.page.textContent('#nextCard'), /turns \d+/);
  await shot(anna.page, 'phone-created');

  step = 'preview';
  let og = await (await fetch(circleUrl)).text();
  assert.match(og, /og:title" content="Uni friends · Birthday Circle"/);
  assert.match(og, /1 birthday so far · next up: Anna/);

  step = 'join';
  const ben = await person('Ben', PHONE);
  const cleo = await person('Cleo', PHONE, [/status of 409/, /status of 404/]);
  const dan = await person('Dan', DESKTOP);
  await ben.page.goto(circleUrl);
  await ben.page.waitForSelector('#joinCard:not([hidden])');
  assert.match(await ben.page.textContent('#joinTitle'), /Uni friends/);
  await shot(ben.page, 'phone-join');
  await fillBirthday(ben.page, 'join', { name: 'Ben', day: today.d, month: today.m });
  await ben.page.click('#joinBtn');
  await ben.page.waitForSelector('#joinCard[hidden]', { state: 'attached' });
  assert.ok(await ben.page.isVisible('#shareCard'));
  assert.match(await ben.page.textContent('#todayCard'), /Ben's birthday today/);

  await cleo.page.goto(circleUrl);
  await cleo.page.waitForSelector('#joinCard:not([hidden])');
  // 29 Feb in a non-leap year is refused in the browser
  await fillBirthday(cleo.page, 'join', { name: 'Cleo', day: 29, month: 2, year: 2001 });
  await cleo.page.click('#joinBtn');
  assert.match(await cleo.page.textContent('#joinError'), /no 29 February/);
  await cleo.page.fill('#joinYear', '');
  await cleo.page.click('#joinBtn');
  await cleo.page.waitForSelector('#joinCard[hidden]', { state: 'attached' });

  await dan.page.goto(circleUrl);
  await dan.page.waitForSelector('#joinCard:not([hidden])');
  await fillBirthday(dan.page, 'join', { name: 'Dan', day: 1, month: 1, year: 1985, showAge: false });
  await dan.page.click('#joinBtn');
  await dan.page.waitForSelector('#joinCard[hidden]', { state: 'attached' });

  step = 'list';
  await anna.page.reload();
  await anna.page.waitForSelector('#list .row');
  const order = await names(anna.page);
  assert.equal(order[0], 'Ben', 'today first');
  assert.equal(order.length, 4);
  assert.equal(await anna.page.textContent('#circleCount'), '4 birthdays');
  const danRow = await anna.page.textContent('#list .row[data-name="Dan"]');
  assert.doesNotMatch(danRow, /turns/, "Dan's hidden age is not shown");
  const api = await (await fetch(circleUrl.replace('/c/', '/api/circles/'))).json();
  assert.equal(api.members.find((m) => m.name === 'Dan').year, null, 'hidden year never leaves the server');
  assert.equal(api.members.find((m) => m.name === 'Anna').year, 1996);
  assert.ok(!JSON.stringify(api).includes('hash'), 'no token hashes in the API');
  assert.equal(await anna.page.locator('#list .edit').count(), 4, 'organiser can edit everyone');
  assert.ok(await anna.page.isVisible('#calCard'));
  const google = await anna.page.getAttribute('#calGoogle', 'href');
  assert.match(google, /^https:\/\/calendar\.google\.com\/calendar\/render\?cid=webcal%3A%2F%2F/);
  assert.match(await anna.page.getAttribute('#calApple', 'href'), /^webcal:\/\/.*\/birthdays\.ics$/);
  await shot(anna.page, 'phone-circle');

  step = 'duplicate';
  // Cleo tries to add herself again as "someone else"
  await cleo.page.click('#addOtherBtn');
  await fillBirthday(cleo.page, 'edit', { name: 'cleo', day: 29, month: 2 });
  await cleo.page.click('#editSave');
  await cleo.page.waitForFunction(() => document.querySelector('#editError').textContent.includes('already on the list'));
  await cleo.page.click('#editCancel');

  step = 'add-other';
  await ben.page.click('#addOtherBtn');
  await fillBirthday(ben.page, 'edit', { name: 'Mia', day: 14, month: 6, year: 2019, showAge: true });
  await shot(ben.page, 'phone-add-other');
  await ben.page.click('#editSave');
  await ben.page.waitForSelector('#list .row[data-name="Mia"]');
  assert.match(await ben.page.textContent('#list .row[data-name="Mia"]'), /you added/);
  assert.equal(await ben.page.locator('#list .edit').count(), 2, 'Ben can edit only his and Mia');

  step = 'edit';
  await ben.page.click('#list .row[data-name="Ben"] .edit');
  await ben.page.fill('#editName', 'Benjamin');
  await ben.page.click('#editSave');
  await ben.page.waitForSelector('#list .row[data-name="Benjamin"]');

  step = 'forbidden';
  // Ben's token cannot edit Anna's entry even through the API
  const benToken = await ben.page.evaluate((id) => localStorage.getItem('bc:t:' + id), circleUrl.split('/').pop());
  const annaId = api.members.find((m) => m.name === 'Anna').id;
  const forbidden = await fetch(circleUrl.replace('/c/', '/api/circles/') + '/members/' + annaId, {
    method: 'DELETE', headers: { 'x-token': benToken },
  });
  assert.equal(forbidden.status, 403);

  step = 'personal-link';
  const benLaptop = await person('Ben-laptop', DESKTOP);
  await benLaptop.page.goto(`${circleUrl}#k=${benToken}`);
  await benLaptop.page.waitForSelector('#list .row');
  assert.equal(new URL(benLaptop.page.url()).hash, '', 'token is removed from the address bar');
  assert.equal(await benLaptop.page.isVisible('#joinCard'), false);
  assert.equal(await benLaptop.page.locator('#list .edit').count(), 2);
  await shot(benLaptop.page, 'desktop-circle');

  step = 'ics';
  const ics = await (await fetch(circleUrl + '/birthdays.ics')).text();
  const unfolded = ics.replace(/\r\n /g, '');
  assert.equal((unfolded.match(/BEGIN:VEVENT/g) || []).length, 5);
  assert.match(unfolded, /SUMMARY:🎂 Mia's birthday/);
  assert.match(unfolded, /RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1/);
  assert.match(unfolded, /DTSTART;VALUE=DATE:1996\d{4}\r\n/, "Anna's shown year is the start");
  assert.doesNotMatch(unfolded, /1985/, "Dan's hidden year is not in the feed");

  step = 'preview-after';
  og = await (await fetch(circleUrl)).text();
  assert.match(og, /5 birthdays so far · next up: Benjamin, today/);

  step = 'organiser';
  await anna.page.reload();
  await anna.page.waitForSelector('#list .row');
  await anna.page.click('#moreCard summary');
  await anna.page.click('#renameBtn');
  await anna.page.waitForFunction(() => document.querySelector('#circleName').textContent === 'Uni friends 2026');
  await anna.page.click('#list .row[data-name="Mia"] .edit');
  await anna.page.click('#editRemove');
  await anna.page.waitForFunction(() => !document.querySelector('#list .row[data-name="Mia"]'));
  // Organiser editing Dan keeps his hidden birth year
  await anna.page.click('#list .row[data-name="Dan"] .edit');
  assert.equal(await anna.page.inputValue('#editYear'), '');
  await anna.page.fill('#editName', 'Daniel');
  await anna.page.click('#editSave');
  await anna.page.waitForSelector('#list .row[data-name="Daniel"]');
  await dan.page.reload();
  await dan.page.waitForSelector('#list .row[data-name="Daniel"]');
  await dan.page.click('#list .row[data-name="Daniel"] .edit');
  assert.equal(await dan.page.inputValue('#editYear'), '1985', 'hidden year survived the organiser edit');
  await dan.page.click('#editCancel');

  step = 'home-recent';
  await ben.page.goto(BASE + '/');
  await ben.page.waitForSelector('#yourCircles:not([hidden])');
  assert.match(await ben.page.textContent('#yourList'), /Uni friends/);

  step = 'delete';
  await anna.page.click('#deleteBtn');
  await anna.page.waitForURL(BASE + '/');
  const gone = await fetch(circleUrl);
  assert.equal(gone.status, 404);
  await cleo.page.reload();
  await cleo.page.waitForSelector('#notFound:not([hidden])');
  circleUrl = null;

  step = 'privacy';
  await desk.page.goto(BASE + '/privacy');
  assert.match(await desk.page.textContent('h1'), /Privacy/);

  assert.deepEqual(errors, [], 'no console errors');
  console.log('E2E PASS', BASE);
} catch (e) {
  console.error('E2E FAIL at step:', step);
  console.error(e);
  if (errors.length) console.error('console errors:', errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
