// JSON API for circles and their birthdays.
// Auth: each browser keeps a random token per circle (localStorage). Only its SHA-256 is stored.
// The creator's token is the circle's admin token; every entry belongs to the token that added it.
import { json, err, now, randomId, sha256, loadCircle, loadMembers, publicMember, touch } from '../_lib.js';
import { validDate } from '../../public/js/bday.js';

const MAX_MEMBERS = 300;
const MAX_PER_TOKEN = 12; // you + children/partner/grandparents you add for them
const INACTIVE_DAYS = 400; // circles nobody opened or synced for this long are deleted
const LIMITS = {
  create: [20, 3600],
  add: [60, 3600],
  write: [300, 3600],
};

function clean(v, max) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function rateLimited(env, request, action) {
  const [max, windowSec] = LIMITS[action];
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const t = now();
  const row = await env.DB.prepare(
    `INSERT INTO rate (k, n, reset_at) VALUES (?1, 1, ?2)
     ON CONFLICT(k) DO UPDATE SET
       n = CASE WHEN reset_at < ?3 THEN 1 ELSE n + 1 END,
       reset_at = CASE WHEN reset_at < ?3 THEN ?2 ELSE reset_at END
     RETURNING n`
  ).bind(action + ':' + (await sha256('pb-bc:' + ip)).slice(0, 24), t + windowSec, t).first();
  return row && row.n > max;
}

async function cleanup(env) {
  const t = now();
  const old = t - INACTIVE_DAYS * 86400;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM members WHERE circle_id IN (SELECT id FROM circles WHERE last_active < ?1)').bind(old),
    env.DB.prepare('DELETE FROM circles WHERE last_active < ?1').bind(old),
    env.DB.prepare('DELETE FROM rate WHERE reset_at < ?1').bind(t),
  ]);
}

// Validate {name, day, month, year, showAge}; returns [error, value].
function parsePerson(body) {
  const name = clean(body.name, 40);
  if (!name) return ['Please enter a name.'];
  const day = Number(body.day);
  const month = Number(body.month);
  let year = body.year === '' || body.year === null || body.year === undefined ? null : Number(body.year);
  const thisYear = new Date().getUTCFullYear();
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > thisYear)) return ['That year does not look right.'];
  if (!validDate(day, month, year)) return ['Please pick a real date.'];
  const showAge = year !== null && !!body.showAge ? 1 : 0;
  return [null, { name, day, month, year, showAge }];
}

async function tokenHash(request) {
  const t = request.headers.get('x-token') || '';
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(t)) return null;
  return sha256(t);
}

async function circleView(env, circle, hash) {
  const members = await loadMembers(env, circle.id);
  const isAdmin = !!hash && hash === circle.admin_hash;
  return {
    id: circle.id,
    name: circle.name,
    isAdmin,
    joined: !!hash && members.some((m) => m.owner_hash === hash),
    members: members.map((m) => {
      const mine = !!hash && m.owner_hash === hash;
      const out = publicMember(m);
      out.mine = mine;
      out.canEdit = mine || isAdmin;
      if (mine) {
        out.year = m.year;
        out.showAge = !!m.show_age;
      }
      return out;
    }),
  };
}

export async function onRequest({ request, env, params }) {
  const path = (params.path || []).join('/');
  const method = request.method;
  const parts = path.split('/');
  let body = {};
  if (method === 'POST' || method === 'PATCH') {
    try {
      body = await request.json();
    } catch {
      return err(400, 'Bad request.');
    }
    if (!body || typeof body !== 'object') return err(400, 'Bad request.');
  }
  try {
    // POST /api/circles  {name, token, person?}
    if (path === 'circles' && method === 'POST') {
      if (await rateLimited(env, request, 'create')) return err(429, 'Too many new circles from here. Try again in an hour.');
      const name = clean(body.name, 60);
      if (!name) return err(400, 'Please give the circle a name.');
      const hash = await tokenHash(request);
      if (!hash) return err(400, 'Missing device token.');
      let person = null;
      if (body.person) {
        const [e, p] = parsePerson(body.person);
        if (e) return err(400, e);
        person = p;
      }
      const id = randomId(12);
      const t = now();
      const stmts = [env.DB.prepare('INSERT INTO circles (id, name, admin_hash, created_at, last_active) VALUES (?1, ?2, ?3, ?4, ?4)').bind(id, name, hash, t)];
      if (person) {
        stmts.push(
          env.DB.prepare('INSERT INTO members (id, circle_id, name, day, month, year, show_age, owner_hash, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
            .bind(randomId(12), id, person.name, person.day, person.month, person.year, person.showAge, hash, t)
        );
      }
      await env.DB.batch(stmts);
      if (Math.random() < 0.1) await cleanup(env);
      return json({ id }, 201);
    }

    if (parts[0] !== 'circles' || !parts[1]) return err(404, 'Not found.');
    const circle = await loadCircle(env, parts[1]);
    if (!circle) return err(404, 'This circle does not exist, or it was deleted.');
    const hash = await tokenHash(request);
    const isAdmin = !!hash && hash === circle.admin_hash;

    // GET /api/circles/:id
    if (parts.length === 2 && method === 'GET') {
      await touch(env, circle.id, circle.last_active);
      return json(await circleView(env, circle, hash));
    }

    // PATCH /api/circles/:id {name}   (admin)
    if (parts.length === 2 && method === 'PATCH') {
      if (!isAdmin) return err(403, 'Only the person who made this circle can rename it.');
      if (await rateLimited(env, request, 'write')) return err(429, 'Too many changes. Try again later.');
      const name = clean(body.name, 60);
      if (!name) return err(400, 'Please give the circle a name.');
      await env.DB.prepare('UPDATE circles SET name = ?1 WHERE id = ?2').bind(name, circle.id).run();
      return json(await circleView(env, { ...circle, name }, hash));
    }

    // DELETE /api/circles/:id   (admin)
    if (parts.length === 2 && method === 'DELETE') {
      if (!isAdmin) return err(403, 'Only the person who made this circle can delete it.');
      await env.DB.batch([
        env.DB.prepare('DELETE FROM members WHERE circle_id = ?1').bind(circle.id),
        env.DB.prepare('DELETE FROM circles WHERE id = ?1').bind(circle.id),
      ]);
      return json({ ok: true });
    }

    // POST /api/circles/:id/members  {name, day, month, year, showAge}
    if (parts[2] === 'members' && parts.length === 3 && method === 'POST') {
      if (!hash) return err(400, 'Missing device token.');
      if (await rateLimited(env, request, 'add')) return err(429, 'Too many birthdays added from here. Try again in an hour.');
      const [e, p] = parsePerson(body);
      if (e) return err(400, e);
      const members = await loadMembers(env, circle.id);
      if (members.length >= MAX_MEMBERS) return err(409, `This circle is full (${MAX_MEMBERS} birthdays).`);
      if (members.filter((m) => m.owner_hash === hash).length >= MAX_PER_TOKEN) return err(409, 'You have added a lot of people already.');
      const dupe = members.find((m) => m.name.toLowerCase() === p.name.toLowerCase() && m.day === p.day && m.month === p.month);
      if (dupe) return err(409, `${p.name} is already on the list with that birthday.`);
      await env.DB.prepare('INSERT INTO members (id, circle_id, name, day, month, year, show_age, owner_hash, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
        .bind(randomId(12), circle.id, p.name, p.day, p.month, p.year, p.showAge, hash, now())
        .run();
      return json(await circleView(env, circle, hash), 201);
    }

    // PATCH / DELETE /api/circles/:id/members/:mid
    if (parts[2] === 'members' && parts.length === 4 && (method === 'PATCH' || method === 'DELETE')) {
      const m = await env.DB.prepare('SELECT id, owner_hash, year, show_age FROM members WHERE id = ?1 AND circle_id = ?2').bind(parts[3], circle.id).first();
      if (!m) return err(404, 'That birthday is no longer on the list.');
      if (!hash || (m.owner_hash !== hash && !isAdmin)) return err(403, 'You can only change birthdays you added.');
      if (await rateLimited(env, request, 'write')) return err(429, 'Too many changes. Try again later.');
      if (method === 'DELETE') {
        await env.DB.prepare('DELETE FROM members WHERE id = ?1').bind(m.id).run();
      } else {
        const [e, p] = parsePerson(body);
        if (e) return err(400, e);
        // The organiser never saw a hidden birth year, so their edit keeps it.
        if (m.owner_hash !== hash && !m.show_age && p.year === null) {
          p.year = m.year;
          p.showAge = 0;
        }
        await env.DB.prepare('UPDATE members SET name = ?1, day = ?2, month = ?3, year = ?4, show_age = ?5 WHERE id = ?6')
          .bind(p.name, p.day, p.month, p.year, p.showAge, m.id)
          .run();
      }
      return json(await circleView(env, circle, hash));
    }

    return err(404, 'Not found.');
  } catch (e) {
    console.error(e);
    return err(500, 'Something went wrong. Please try again.');
  }
}
