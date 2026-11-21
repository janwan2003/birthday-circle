// Small helpers shared by the pages.
import { MONTHS, daysInMonth } from './bday.js';

export const $ = (sel, root = document) => root.querySelector(sel);

export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) n.append(c.nodeType ? c : String(c));
  return n;
}

// Each circle gets its own random token on this device; the server only stores its hash.
export function newToken() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
export const getToken = (id) => store.get('bc:t:' + id);
export const setToken = (id, t) => store.set('bc:t:' + id, t);
export const forget = (id) => { store.del('bc:t:' + id); saveRecent(recent().filter((c) => c.id !== id)); };

// Circles opened on this device, for the "Your circles" list on the home page.
export function recent() {
  try { return JSON.parse(store.get('bc:recent') || '[]').filter((c) => c && c.id && c.name); } catch { return []; }
}
function saveRecent(list) { store.set('bc:recent', JSON.stringify(list.slice(0, 20))); }
export function remember(id, name) { saveRecent([{ id, name }, ...recent().filter((c) => c.id !== id)]); }

export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers['x-token'] = token;
  let res;
  try {
    res = await fetch('/api/' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw Object.assign(new Error('No connection. Check your internet and try again.'), { status: 0 });
  }
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { status: res.status });
  return data;
}

let toastTimer;
export function toast(msg) {
  let t = $('.toast');
  if (!t) { t = el('div', { class: 'toast', role: 'status' }); document.body.append(t); }
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

export async function copy(text, msg = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = el('textarea', { style: 'position:fixed;opacity:0' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {}
    ta.remove();
  }
  toast(msg);
}

export async function share({ title, text, url }) {
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  await copy(`${text} ${url}`, 'Link copied. Paste it in your group chat.');
}

// Fill the day / month selects of a birthday form and keep the day list valid for the month.
export function setupDateFields(form) {
  const day = form.querySelector('[name=day]');
  const month = form.querySelector('[name=month]');
  const year = form.querySelector('[name=year]');
  const showAge = form.querySelector('[name=showAge]');
  month.append(el('option', { value: '' }, 'Month'), ...MONTHS.map((m, i) => el('option', { value: i + 1 }, m)));
  const fillDays = () => {
    const keep = day.value;
    const max = month.value ? daysInMonth(Number(month.value), 2000) : 31;
    day.replaceChildren(el('option', { value: '' }, 'Day'), ...Array.from({ length: max }, (_, i) => el('option', { value: i + 1 }, i + 1)));
    if (keep && Number(keep) <= max) day.value = keep;
  };
  fillDays();
  month.addEventListener('change', fillDays);
  const syncAge = () => {
    const has = /^\d{4}$/.test(year.value.trim());
    showAge.disabled = !has;
    showAge.closest('.check').classList.toggle('disabled', !has);
    if (!has) showAge.checked = false;
  };
  year.addEventListener('input', syncAge);
  syncAge();
  return {
    set(p) {
      form.querySelector('[name=name]').value = p.name || '';
      month.value = p.month || '';
      fillDays();
      day.value = p.day || '';
      year.value = p.year || '';
      syncAge();
      showAge.checked = !!p.showAge;
    },
    read() {
      const y = year.value.trim();
      return {
        name: form.querySelector('[name=name]').value.trim(),
        day: Number(day.value) || 0,
        month: Number(month.value) || 0,
        year: y ? Number(y) : null,
        showAge: showAge.checked,
      };
    },
    check(p) {
      if (!p.name) return 'Please enter a name.';
      if (!p.day || !p.month) return 'Please pick the day and month.';
      const thisYear = new Date().getFullYear();
      if (p.year !== null && (!Number.isInteger(p.year) || p.year < 1900 || p.year > thisYear)) return 'Year should look like 1990, or leave it empty.';
      if (p.year !== null && p.month === 2 && p.day === 29 && daysInMonth(2, p.year) === 28) return `${p.year} had no 29 February.`;
      return '';
    },
  };
}

// The birthday fields markup, used in several forms.
export function birthdayFields(prefix, { nameLabel = 'Your name', namePlaceholder = 'First name', ageLabel = 'Show my age (“turns 30”) to the group' } = {}) {
  return `
  <div class="field"><label for="${prefix}Name">${nameLabel}</label>
    <input type="text" id="${prefix}Name" name="name" maxlength="40" autocomplete="given-name" placeholder="${namePlaceholder}"></div>
  <div class="field"><label id="${prefix}DateLabel">Birthday</label>
    <div class="date-row" role="group" aria-labelledby="${prefix}DateLabel">
      <select name="day" id="${prefix}Day" aria-label="Day"></select>
      <select name="month" id="${prefix}Month" aria-label="Month"></select>
      <input type="number" name="year" id="${prefix}Year" inputmode="numeric" min="1900" max="2100" placeholder="Year" aria-label="Year (optional)">
    </div>
    <div class="hint">The year is optional.</div></div>
  <label class="check"><input type="checkbox" name="showAge" id="${prefix}ShowAge"> ${ageLabel}</label>`;
}
