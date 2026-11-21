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
    try { sessionStorage.setItem('bc:new', id); sessionStorage.setItem('bc:me', person.name); } catch {}
    location.href = '/c/' + id;
  } catch (err) {
    errBox.textContent = err.message;
    btn.disabled = false;
    btn.textContent = 'Create the circle and get the link';
  }
});

const mine = recent();
if (mine.length) {
  $('#yourCircles').hidden = false;
  $('#yourList').replaceChildren(...mine.map((c) => el('li', {}, el('a', { href: '/c/' + c.id }, c.name, el('span', { 'aria-hidden': 'true' }, '→')))));
}
