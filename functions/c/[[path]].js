// /c/<id>                → the circle page, with a link preview showing live state
// /c/<id>/birthdays.ics  → calendar feed (subscribe in Google, Apple, Outlook)
import { esc, loadCircle, loadMembers, publicMember, touch } from '../_lib.js';
import { buildICS, upcoming, todayUTC, MONTHS_SHORT, whenText } from '../../public/js/bday.js';

async function ics(context, id) {
  const { request, env } = context;
  const cache = caches.default;
  const key = new Request(new URL(request.url).origin + '/c/' + id + '/birthdays.ics');
  const hit = await cache.match(key);
  if (hit) return hit;
  const circle = await loadCircle(env, id);
  if (!circle) return new Response('Not found', { status: 404 });
  await touch(env, circle.id, circle.last_active);
  const members = (await loadMembers(env, id)).map(publicMember);
  const body = buildICS(circle, members, { origin: new URL(request.url).origin });
  const res = new Response(body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `inline; filename="birthdays.ics"`,
      'cache-control': 'public, max-age=900',
      'x-robots-tag': 'noindex',
    },
  });
  context.waitUntil(cache.put(key, res.clone()));
  return res;
}

async function page({ request, env }, id) {
  const url = new URL(request.url);
  const asset = await env.ASSETS.fetch(new URL('/circle', url.origin));
  let html = await asset.text();
  let title = 'Add your birthday · Birthday Circle';
  let desc = 'One shared birthday list for your group. Add yours in 10 seconds: no app, no sign-up.';
  let status = 200;
  try {
    const circle = await loadCircle(env, id);
    if (circle) {
      const members = await loadMembers(env, id);
      const n = members.length;
      title = `${circle.name} · Birthday Circle`;
      if (n === 0) {
        desc = 'Add your birthday to the list in 10 seconds, so nobody forgets it. No app, no sign-up.';
      } else {
        const next = upcoming(members.map(publicMember), todayUTC())[0];
        const when = next.next.inDays === 0 ? 'today' : `${next.next.d} ${MONTHS_SHORT[next.next.m - 1]} (${whenText(next.next.inDays).toLowerCase()})`;
        desc = `${n} ${n === 1 ? 'birthday' : 'birthdays'} so far · next up: ${next.name}, ${when}. Add yours in 10 seconds, no sign-up.`;
      }
    } else {
      status = 404;
      title = 'Circle not found · Birthday Circle';
    }
  } catch (e) {
    console.error(e);
  }
  const meta = `<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Birthday Circle">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url.origin + '/c/' + id)}">
<meta property="og:image" content="${url.origin}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="noindex">`;
  html = html.replace(/<!--META-->[\s\S]*?<!--\/META-->/, meta);
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function onRequestGet(context) {
  const parts = context.params.path || [];
  const id = String(parts[0] || '').replace(/\.ics$/, '');
  if (parts.length === 2 && parts[1] === 'birthdays.ics') return ics(context, id);
  if (parts.length === 1 && String(parts[0]).endsWith('.ics')) return ics(context, id);
  if (parts.length === 1) return page(context, id);
  return new Response('Not found', { status: 404 });
}
