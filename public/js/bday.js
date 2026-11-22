// Birthday maths and the calendar (.ics) feed. Shared by the browser and the Functions.

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

export const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const daysInMonth = (m, y = 2000) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

// A day/month pair is valid if it exists in a leap year (so 29 Feb is allowed).
export function validDate(day, month, year) {
  if (!Number.isInteger(day) || !Number.isInteger(month)) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  if (year != null) return day <= daysInMonth(month, year);
  return day <= daysInMonth(month, 2000);
}

// The day the birthday is celebrated in a given year: 29 Feb falls on 28 Feb outside leap years.
export function celebrated(day, month, year) {
  if (month === 2 && day === 29 && !isLeap(year)) return { y: year, m: 2, d: 28 };
  return { y: year, m: month, d: day };
}

const utcDay = (y, m, d) => Date.UTC(y, m - 1, d) / 86400000;

// Next occurrence on or after `today` ({y, m, d}). Returns {y, m, d, inDays}.
export function nextBirthday(day, month, today) {
  let occ = celebrated(day, month, today.y);
  if (utcDay(occ.y, occ.m, occ.d) < utcDay(today.y, today.m, today.d)) occ = celebrated(day, month, today.y + 1);
  return { ...occ, inDays: utcDay(occ.y, occ.m, occ.d) - utcDay(today.y, today.m, today.d) };
}

export function todayLocal(date = new Date()) {
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}
export function todayUTC(date = new Date()) {
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

// Members sorted by their next birthday, soonest first (today first), ties by name.
export function upcoming(members, today) {
  return members
    .map((p) => {
      const next = nextBirthday(p.day, p.month, today);
      const turns = p.year ? next.y - p.year : null;
      return { ...p, next, turns: turns && turns > 0 && turns < 130 ? turns : null };
    })
    .sort((a, b) => a.next.inDays - b.next.inDays || a.name.localeCompare(b.name));
}

export function whenText(inDays) {
  if (inDays === 0) return 'Today';
  if (inDays === 1) return 'Tomorrow';
  // Exact days up to two weeks: "Next week" was wrong for, say, a Wednesday 10 days away.
  if (inDays < 14) return `In ${inDays} days`;
  if (inDays < 60) return `In ${Math.round(inDays / 7)} weeks`;
  return `In ${Math.round(inDays / 30.4)} months`;
}

export const possessive = (name) => (/s$/i.test(name) ? `${name}'` : `${name}'s`);

// ---------- iCalendar (RFC 5545) ----------

const pad = (n, w = 2) => String(n).padStart(w, '0');
const icsDate = (y, m, d) => `${pad(y, 4)}${pad(m)}${pad(d)}`;

export function icsEscape(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Fold lines longer than 75 octets (UTF-8), continuation lines start with a space.
export function foldLine(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out = [];
  let cur = '';
  let curLen = 0;
  for (const ch of line) {
    const len = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (curLen + len > limit) {
      out.push(cur);
      cur = '';
      curLen = 0;
    }
    cur += ch;
    curLen += len;
  }
  out.push(cur);
  return out.join('\r\n ');
}

// circle: {id, name}; members: [{id, name, day, month, year (only when shown), created_at}]
export function buildICS(circle, members, { origin, now = new Date() }) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const url = `${origin}/c/${circle.id}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Birthday Circle//Birthdays//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(circle.name + ' birthdays')}`,
    `X-WR-CALDESC:${icsEscape(`Birthdays in ${circle.name}. Add yours or see the list: ${url}`)}`,
    'X-PUBLISHED-TTL:PT6H',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
  ];
  for (const p of members) {
    const leapDay = p.month === 2 && p.day === 29;
    const startYear = p.year && validDate(p.day, p.month, p.year) ? p.year : 2000; // 2000 is a leap year
    const start = { y: startYear, m: p.month, d: p.day };
    const endMs = Date.UTC(start.y, start.m - 1, start.d + 1);
    const end = new Date(endMs);
    const desc = [`${possessive(p.name)} birthday`];
    if (p.year) desc.push(`Born in ${p.year}.`);
    desc.push(`From the ${circle.name} birthday circle: ${url}`);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${p.id}@birthday-circle`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(start.y, start.m, start.d)}`,
      `DTEND;VALUE=DATE:${icsDate(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate())}`,
      leapDay ? 'RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1' : 'RRULE:FREQ=YEARLY',
      `SUMMARY:${icsEscape(`🎂 ${possessive(p.name)} birthday`)}`,
      `DESCRIPTION:${icsEscape(desc.join('\n'))}`,
      `URL:${url}`,
      'TRANSP:TRANSPARENT',
      'CATEGORIES:Birthday',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'TRIGGER:PT9H',
      `DESCRIPTION:${icsEscape(`${possessive(p.name)} birthday today`)}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
