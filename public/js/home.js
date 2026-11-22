import { MONTHS_SHORT } from './bday.js';
import { $, el, api, newToken, setToken, remember, recent, setupDateFields, birthdayFields } from './common.js';

const form = $('#createForm');
$('#meFields').innerHTML = birthdayFields('me');
const me = setupDateFields(form);
const skip = $('#skipMe');
skip.addEventListener('change', () => { $('#meFields').hidden = skip.checked; });

// "Start your own" links from a circle can prefill the group name: /?name=Family
const pre = new URLSearchParams(location.search).get('name');
if (pre) $('#circleName').value = pre.slice(0, 60);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errBox = $('#createError');
  errBox.textContent = '';
  const name = $('#circleName').value.trim();
  if (!name) { errBox.textContent = 'Please give the group a name.'; $('#circleName').focus(); return; }
  const person = me.read();
  const body = { name };
  if (!skip.checked) {
    if (!person.name) { errBox.textContent = 'Please enter your name.'; $('#meName').focus(); return; }
    const problem = me.check(person);
    if (problem) { errBox.textContent = problem; return; }
    body.person = person;
  }
  const btn = $('#createBtn');
  btn.disabled = true;
  btn.textContent = 'Creating…';
  const token = newToken();
  try {
    const { id } = await api('circles', { method: 'POST', body, token });
    setToken(id, token);
    remember(id, name);
    try { sessionStorage.setItem('bc:new', id); } catch {}
    location.href = '/c/' + id;
  } catch (err) {
    errBox.textContent = err.message;
    btn.disabled = false;
    btn.textContent = 'Create the circle and get the link';
  }
});

// Coming back with the Back button (page restored from cache) must not leave the button stuck on "Creating…".
window.addEventListener('pageshow', (e) => {
  if (e.persisted) { const b = $('#createBtn'); b.disabled = false; b.textContent = 'Create the circle and get the link'; }
});

const mine = recent();
if (mine.length) {
  $('#yourCircles').hidden = false;
  $('#yourList').replaceChildren(...mine.map((c) => el('li', {}, el('a', { href: '/c/' + c.id }, c.name, el('span', { 'aria-hidden': 'true' }, '→')))));
}

// The example circle next to the form: dates are relative to today so it never looks stale.
const demo = $('#demoList');
if (demo) {
  const people = [[1, 'Grandma Rose', 'Tomorrow · turns 80'], [5, 'Leo', 'In 5 days · turns 8'], [19, 'Aunt Kate', 'In 3 weeks'], [44, 'Sam', 'In 6 weeks']];
  const now = new Date();
  demo.replaceChildren(...people.map(([add, name, sub]) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + add);
    return el('div', { class: 'row' },
      el('div', { class: 'date' }, el('b', {}, d.getDate()), el('span', {}, MONTHS_SHORT[d.getMonth()].toUpperCase())),
      el('div', { class: 'info' }, el('div', { class: 'name' }, name), el('div', { class: 'sub' }, sub)));
  }));
  $('#demo').hidden = false;
}
