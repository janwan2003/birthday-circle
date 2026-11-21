// Shared helpers for the Functions.
export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
export const err = (status, message) => json({ error: message }, status);
export const now = () => Math.floor(Date.now() / 1000);
export const ID_RE = /^[A-Za-z0-9]{10,16}$/;

export function randomId(len = 12) {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return s;
}

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Mark the circle as used at most once a day, so inactive circles can be deleted later.
export async function touch(env, id, lastActive) {
  const t = now();
  if (t - (lastActive || 0) > 86400) {
    await env.DB.prepare('UPDATE circles SET last_active = ?1 WHERE id = ?2').bind(t, id).run();
  }
}

export async function loadCircle(env, id) {
  if (!ID_RE.test(id)) return null;
  return env.DB.prepare('SELECT id, name, admin_hash, created_at, last_active FROM circles WHERE id = ?1').bind(id).first();
}

export async function loadMembers(env, id) {
  const { results } = await env.DB.prepare(
    'SELECT id, name, day, month, year, show_age, owner_hash, created_at FROM members WHERE circle_id = ?1 ORDER BY month, day, name'
  ).bind(id).all();
  return results || [];
}

// What other people may see: the year only if its owner chose to show their age.
export const publicMember = (m) => ({ id: m.id, name: m.name, day: m.day, month: m.month, year: m.show_age ? m.year : null });
