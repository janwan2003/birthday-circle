import { $, el, api, newToken, getToken, setToken, forget, remember, toast, copy, share, setupDateFields, birthdayFields } from './common.js';
import { upcoming, todayLocal, whenText, possessive, MONTHS, MONTHS_SHORT } from './bday.js';

const id = location.pathname.split('/')[2] || '';
const origin = location.origin;
const circleUrl = `${origin}/c/${id}`;
const feedUrl = `${circleUrl}/birthdays.ics`;

// A personal link (#k=token) signs this device in to the circle, then the token leaves the URL.
const hashToken = new URLSearchParams(location.hash.slice(1)).get('k');
if (hashToken && /^[A-Za-z0-9_-]{20,64}$/.test(hashToken)) {
  setToken(id, hashToken);
  history.replaceState(null, '', location.pathname);
}

let token = getToken(id);
let state = null;
let justShared = false;
let justJoined = false;
try { justShared = sessionStorage.getItem('bc:new') === id; } catch {}

const joinForm = $('#joinForm');
$('#joinFields').innerHTML = birthdayFields('join');
const joinDate = setupDateFields(joinForm);
const editForm = $('#editForm');
$('#editFields').innerHTML = birthdayFields('edit', { nameLabel: 'Name', ageLabel: 'Show the age (“turns 30”) to the group' });
const editDate = setupDateFields(editForm);
const dialog = $('#editDialog');
let editing = null; // member being edited, or 'new' for "add someone else"

function ensureToken() {
  if (!token) { token = newToken(); setToken(id, token); }
  return token;
}

async function load() {
  try {
    state = await api('circles/' + id, { token });
  } catch (e) {
    $('#loading').hidden = true;
    if (e.status === 404) { $('#notFound').hidden = false; forget(id); document.title = 'Circle not found · Birthday Circle'; return; }
    $('#loading').textContent = e.message;
    $('#loading').hidden = false;
    return;
  }
  remember(id, state.name);
  render();
}

function render() {
  $('#loading').hidden = true;
  $('#app').hidden = false;
  const people = upcoming(state.members, todayLocal());
  const n = people.length;
  document.title = `${state.name} · Birthday Circle`;
  $('#circleName').textContent = state.name;
  $('#circleCount').textContent = n === 0 ? 'No birthdays yet' : `${n} ${n === 1 ? 'birthday' : 'birthdays'}`;

  // Today
  const today = people.filter((p) => p.next.inDays === 0);
  const tc = $('#todayCard');
  tc.hidden = today.length === 0;
  if (today.length) {
    const names = today.map((p) => p.name);
    const list = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names.at(-1);
    const age = today.length === 1 && today[0].turns ? ` ${today[0].name} turns ${today[0].turns}.` : '';
    const wish = `Happy birthday ${list}! 🎂🎉`;
    tc.replaceChildren(
      el('div', { class: 'big', 'aria-hidden': 'true' }, '🎂'),
      el('h2', {}, `It's ${names.length === 1 ? possessive(list) : list + "'s"} birthday today!`),
      el('p', { class: 'muted' }, `Don't forget to say happy birthday.${age}`),
      el('button', { class: 'btn', type: 'button', onclick: () => share({ title: wish, text: wish, url: '' }).catch(() => {}) }, 'Send a birthday wish')
    );
  }

  // Join form: only if this device has no entry yet
  const joined = state.joined;
  $('#joinCard').hidden = joined;
  $('#joinTitle').textContent = `Add your birthday to ${state.name}`;

  // Share card: right after creating, or after joining
  // Full invite card right after creating or joining; a compact one on later visits.
  const fresh = justShared || justJoined;
  $('#shareCard').hidden = !(fresh || joined || state.isAdmin);
  $('#shareCard').classList.toggle('compact', !fresh);
  $('#shareTitle').textContent = justShared ? 'Now send the link to the group' : fresh ? 'Now invite the rest of the group' : 'Missing someone?';
  const msg = `Add your birthday to our “${state.name}” birthday list so nobody gets forgotten 🎂 It takes 10 seconds, no app or sign-up:`;
  $('#shareText').textContent = `${msg} ${circleUrl}`;
  $('#waBtn').href = 'https://wa.me/?text=' + encodeURIComponent(`${msg} ${circleUrl}`);
  $('#shareBtn').onclick = () => share({ title: `${state.name} birthdays`, text: msg, url: circleUrl });
  $('#copyBtn').onclick = () => copy(`${msg} ${circleUrl}`, 'Copied. Paste it in your group chat.');

  // Next up (skip if the only "next" is today, the banner covers it)
  const nc = $('#nextCard');
  const next = people.find((p) => p.next.inDays > 0);
  nc.hidden = !next;
  if (next) {
    const sameDay = people.filter((p) => p.next.inDays === next.next.inDays);
    const who = sameDay.map((p) => p.name).join(' & ');
    const sub = [whenText(next.next.inDays), `${next.next.d} ${MONTHS_SHORT[next.next.m - 1]}`];
    if (sameDay.length === 1 && next.turns) sub.push(`turns ${next.turns}`);
    nc.replaceChildren(
      el('div', { class: 'small muted', style: 'font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em' }, 'Next birthday'),
      el('div', { class: 'next' },
        el('div', { class: 'cal-badge', 'aria-hidden': 'true' }, el('div', { class: 'm' }, MONTHS_SHORT[next.next.m - 1].toUpperCase()), el('div', { class: 'd' }, next.next.d)),
        el('div', {}, el('div', { class: 'who' }, who), el('div', { class: 'when' }, sub.join(' · '))))
    );
  }

  // Calendar
  $('#calCard').hidden = n === 0;
  const webcal = feedUrl.replace(/^https?:/, 'webcal:');
  $('#calGoogle').href = 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(webcal);
  $('#calApple').href = webcal;
  $('#calOutlook').href = `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}&name=${encodeURIComponent(state.name + ' birthdays')}`;
  $('#calCopy').onclick = () => copy(feedUrl, 'Calendar link copied. Add it as a calendar “from URL”.');

  // List, grouped by month, starting from the current month
  const list = $('#list');
  if (!n) {
    list.replaceChildren(el('p', { class: 'empty' }, 'Nobody has added a birthday yet. Be the first!'));
  } else {
    const out = [];
    let lastKey = null;
    for (const p of people) {
      const key = `${p.next.y}-${p.next.m}`;
      if (key !== lastKey) {
        const label = MONTHS[p.next.m - 1] + (p.next.y !== todayLocal().y ? ` ${p.next.y}` : '');
        out.push(el('div', { class: 'month-h' }, label));
        lastKey = key;
      }
      const subBits = [whenText(p.next.inDays)];
      if (p.turns) subBits.push(`turns ${p.turns}`);
      out.push(
        el('div', { class: 'row' + (p.next.inDays === 0 ? ' is-today' : ''), 'data-name': p.name },
          el('div', { class: 'date' }, el('b', {}, p.next.d), el('span', {}, MONTHS_SHORT[p.next.m - 1].toUpperCase())),
          el('div', { class: 'info' },
            el('div', { class: 'name' }, p.name, p.mine ? el('span', { class: 'you' }, 'you added') : null),
            el('div', { class: 'sub' }, subBits.join(' · '))),
          p.canEdit ? el('button', { class: 'btn ghost small edit', type: 'button', 'aria-label': `Edit ${p.name}`, onclick: () => openEdit(p) }, 'Edit') : null)
      );
    }
    list.replaceChildren(...out);
  }

  $('#personal').hidden = !joined && !state.isAdmin;
  $('#adminBox').hidden = !state.isAdmin;
}

joinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errBox = $('#joinError');
  errBox.textContent = '';
  const p = joinDate.read();
  const problem = joinDate.check(p);
  if (problem) { errBox.textContent = problem; return; }
  const btn = $('#joinBtn');
  btn.disabled = true;
  try {
    state = await api(`circles/${id}/members`, { method: 'POST', body: p, token: ensureToken() });
    justJoined = true;
    render();
    toast(`Added. Happy early birthday, ${p.name}!`);
    $('#shareCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    errBox.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

function openEdit(p) {
  editing = p || 'new';
  $('#editError').textContent = '';
  if (p) {
    $('#editTitle').textContent = `Edit ${possessive(p.name)} birthday`;
    editDate.set({ name: p.name, day: p.day, month: p.month, year: p.year, showAge: p.mine ? p.showAge : !!p.year });
    $('#editRemove').hidden = false;
  } else {
    $('#editTitle').textContent = 'Add someone else';
    editDate.set({});
    $('#editRemove').hidden = true;
  }
  dialog.showModal();
}

$('#addOtherBtn').addEventListener('click', () => openEdit(null));
$('#editCancel').addEventListener('click', () => dialog.close());
editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errBox = $('#editError');
  errBox.textContent = '';
  const p = editDate.read();
  const problem = editDate.check(p);
  if (problem) { errBox.textContent = problem; return; }
  try {
    if (editing === 'new') {
      state = await api(`circles/${id}/members`, { method: 'POST', body: p, token: ensureToken() });
      toast(`${p.name} added`);
    } else {
      state = await api(`circles/${id}/members/${editing.id}`, { method: 'PATCH', body: p, token });
      toast('Saved');
    }
    dialog.close();
    render();
  } catch (err) {
    errBox.textContent = err.message;
  }
});
$('#editRemove').addEventListener('click', async () => {
  if (!editing || editing === 'new') return;
  if (!confirm(`Remove ${editing.name} from the list?`)) return;
  try {
    state = await api(`circles/${id}/members/${editing.id}`, { method: 'DELETE', token });
    dialog.close();
    render();
    toast('Removed');
  } catch (err) {
    $('#editError').textContent = err.message;
  }
});

$('#personalCopy').addEventListener('click', () => copy(`${circleUrl}#k=${token}`, 'Personal link copied. Open it on your other device.'));
$('#renameBtn').addEventListener('click', async () => {
  const name = prompt('New name for the circle', state.name);
  if (!name || !name.trim()) return;
  try {
    state = await api('circles/' + id, { method: 'PATCH', body: { name: name.trim() }, token });
    remember(id, state.name);
    render();
    toast('Renamed');
  } catch (err) { toast(err.message); }
});
$('#deleteBtn').addEventListener('click', async () => {
  if (!confirm(`Delete “${state.name}” and every birthday in it, for everyone? This cannot be undone.`)) return;
  try {
    await api('circles/' + id, { method: 'DELETE', token });
    forget(id);
    location.href = '/';
  } catch (err) { toast(err.message); }
});

load();
