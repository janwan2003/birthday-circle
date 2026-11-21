import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextBirthday, upcoming, validDate, buildICS, foldLine, icsEscape, whenText, possessive } from '../../public/js/bday.js';

test('next birthday: later this year, today, already passed', () => {
  const t = { y: 2026, m: 11, d: 21 };
  assert.deepEqual(nextBirthday(26, 11, t), { y: 2026, m: 11, d: 26, inDays: 5 });
  assert.equal(nextBirthday(21, 11, t).inDays, 0);
  assert.deepEqual(nextBirthday(20, 11, t), { y: 2027, m: 11, d: 20, inDays: 364 });
  assert.deepEqual(nextBirthday(1, 1, t), { y: 2027, m: 1, d: 1, inDays: 41 });
});

test('29 February falls on 28 February outside leap years', () => {
  assert.deepEqual(nextBirthday(29, 2, { y: 2026, m: 11, d: 21 }), { y: 2027, m: 2, d: 28, inDays: 99 });
  assert.deepEqual(nextBirthday(29, 2, { y: 2027, m: 3, d: 1 }), { y: 2028, m: 2, d: 29, inDays: 365 });
  assert.equal(nextBirthday(29, 2, { y: 2027, m: 2, d: 28 }).inDays, 0);
});

test('validDate', () => {
  assert.ok(validDate(29, 2));
  assert.ok(!validDate(30, 2));
  assert.ok(!validDate(31, 4));
  assert.ok(!validDate(29, 2, 2023));
  assert.ok(validDate(29, 2, 2024));
  assert.ok(!validDate(0, 1));
  assert.ok(!validDate(1, 13));
  assert.ok(!validDate(1.5, 1));
});

test('upcoming sorts by next birthday and computes ages', () => {
  const t = { y: 2026, m: 11, d: 21 };
  const list = upcoming([
    { name: 'Ana', day: 1, month: 1, year: 1990 },
    { name: 'Ben', day: 21, month: 11, year: null },
    { name: 'Cat', day: 20, month: 11, year: 2000 },
    { name: 'Dev', day: 25, month: 12 },
  ], t);
  assert.deepEqual(list.map((p) => p.name), ['Ben', 'Dev', 'Ana', 'Cat']);
  assert.equal(list[2].turns, 37);
  assert.equal(list[3].turns, 27);
  assert.equal(list[0].turns, null);
});

test('when text and possessive', () => {
  assert.equal(whenText(0), 'Today');
  assert.equal(whenText(1), 'Tomorrow');
  assert.equal(whenText(5), 'In 5 days');
  assert.equal(whenText(21), 'In 3 weeks');
  assert.equal(possessive('James'), "James'");
  assert.equal(possessive('Sara'), "Sara's");
});

test('ics escaping and folding', () => {
  assert.equal(icsEscape('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
  const long = 'DESCRIPTION:' + 'ü'.repeat(80);
  const folded = foldLine(long);
  for (const line of folded.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  assert.equal(folded.split('\r\n').map((l, i) => (i ? l.slice(1) : l)).join(''), long);
});

test('ics feed is well formed', () => {
  const ics = buildICS({ id: 'abcDEF234567', name: 'Uni, friends; 2026' }, [
    { id: 'm1', name: 'Sara', day: 3, month: 12, year: 1996 },
    { id: 'm2', name: 'Leap', day: 29, month: 2, year: null },
    { id: 'm3', name: 'Zoë Ångström-Łukasiewicz with a very long name indeed', day: 31, month: 12 },
  ], { origin: 'https://example.test', now: new Date('2026-11-21T10:00:00Z') });
  assert.ok(ics.endsWith('\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'all line endings are CRLF');
  const lines = ics.split('\r\n').filter(Boolean);
  for (const l of lines) assert.ok(new TextEncoder().encode(l).length <= 75);
  const unfolded = ics.replace(/\r\n /g, '');
  assert.match(unfolded, /^BEGIN:VCALENDAR\r\nVERSION:2.0\r\n/);
  assert.ok(unfolded.includes('X-WR-CALNAME:Uni\\, friends\\; 2026 birthdays\r\n'));
  assert.equal((unfolded.match(/BEGIN:VEVENT/g) || []).length, 3);
  assert.equal((unfolded.match(/END:VEVENT/g) || []).length, 3);
  assert.match(unfolded, /DTSTART;VALUE=DATE:19961203\r\nDTEND;VALUE=DATE:19961204\r\nRRULE:FREQ=YEARLY\r\n/);
  assert.match(unfolded, /DTSTART;VALUE=DATE:20000229\r\nDTEND;VALUE=DATE:20000301\r\nRRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1/);
  assert.match(unfolded, /DTSTART;VALUE=DATE:20001231\r\nDTEND;VALUE=DATE:20010101/);
  assert.match(unfolded, /SUMMARY:🎂 Sara's birthday/);
  assert.match(unfolded, /DTSTAMP:20261121T100000Z/);
  assert.ok(unfolded.trim().endsWith('END:VCALENDAR'));
});
