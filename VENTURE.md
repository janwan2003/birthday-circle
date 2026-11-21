---
slug: birthday-circle
stage: launched
priority: 4
url: https://pb-birthday-circle.pages.dev
repo: https://github.com/janwan2003/birthday-circle
updated: 2026-11-21
---

# birthday-circle

## Thesis

**Who:** Friend groups, families, office teams, school classes and sports clubs who keep
forgetting each other's birthdays, especially the many people who no longer use Facebook,
which used to remind them.

**What:** One link per group. Someone creates "Uni friends" and posts the link in the group
chat. Each person opens it, types their name and birthday (day and month, year optional),
and that's it. Everyone in the group now sees the group's birthday list: the next birthday,
"Sara turns 30 in 5 days". They can subscribe to it as a calendar (an .ics feed for
Google/Apple/Outlook, no account) or get an optional weekly email digest. On a birthday,
the page offers "sign a group card" (hand-off to the `group-card` venture) and a
"who's organising?" note.

**Needs others:** yes. The value is *other people's* birthdays. A list with only your own
is empty.

**Viral moment:** the group chat post "add your birthday here so we stop forgetting",
which usually gets a burst of joins within an hour. Later, every birthday reminder
brings the group back. After adding yours: "Make one for your family / team too."

**How often:** created once per group, but each person belongs to several groups (family,
friends, team, class), and every birthday is a recurring touchpoint (about 12 a year for
a 12-person group).

**Why now:** Facebook removed its birthday export to external calendars, and many people left
it. The replacement is personal reminder apps where each user types everyone in by hand.

## Market evidence

Searches run 2026-11-20. Sources are search-result summaries, not opened pages.

- **Pain:** Facebook "quietly removed" the birthday calendar export
  ([Digital Trends](https://uat4.www.digitaltrends.com/?p=2356761)). A
  [Replit forum post](https://replit.discourse.group/t/built-a-birthday-calendar-for-all-of-us-who-left-facebook-behind-and-havent-managed-birthdays-well-since/3795)
  describes "all of us who left Facebook behind and haven't managed birthdays well since". Advice
  pieces tell people to type close friends' birthdays into a calendar by hand
  ([InsideHook](https://www.insidehook.com/article/advice/quit-facebook-how-to-replace-apps-tools)) or keep
  a paper calendar ([Quartz](https://qz.com/quartzy/1479903/why-a-paper-birthday-calendar-is-so-much-better-than-a-facebook-reminder)).
  [TechCrunch](https://techcrunch.com/2024/07/09/facebook-keeps-asking-me-to-say-happy-birthday-to-dead-people)
  reports Facebook birthday reminders misfiring.
- **Closest competitors:** [Hoera](https://alternativeto.net/software/hoera/about/) (free web app, group link,
  members add their own birthday, weekly email; current status not confirmed) and
  [Hurrayy](https://www.producthunt.com/posts/hurrayy) (birthday groups). Both are small (no
  usage figures found).
- **Solo apps dominate the store:** [Birthday Calendar Elite](https://apps.apple.com/us/app/birthday-calendar-elite/id797758928),
  [Birthday calendar and reminder](https://apps.apple.com/us/app/id1508329346), and
  [Birthdays Reminder](https://www.producthunt.com/posts/birthdays-reminder) (email, manual entry).
  Each user enters every friend by hand.
- **Workplace version is a paid category:** Slack/Teams birthday bots exist (not researched this session).
- **How people do it today:** a pinned message or Google Sheet in the group, or the class parents'
  list kept by one person.
- Search volume not measured.
- **Checked 2026-11-21 (pages opened by a fetch agent):** hoera.app is alive (homepage loads, AlternativeTo entry updated
  6 Oct 2026). Joining needs an email address plus a 6-digit code; reminders are a weekly email, WhatsApp reminders are paid;
  no .ics feed mentioned. Hurrayy's Product Hunt launch is from 2024 with no recent activity (app itself not opened).
  birthdaycalendar.app is an unrelated single-user iOS app. A search for "group birthday calendar link ... ics subscribe"
  found no tool where members self-enter into one shared calendar feed.

## Our edge

- **Loop: needs others.**
- **K estimate ≈ 1.5** = 12 members per group × 65% who add their birthday (10 seconds, no account)
  × 20% who then start one for another group. Reason: the payoff is personal (you want *your*
  family's and team's birthdays too), and everyone belongs to several groups. This sits on the
  1.5 line, so the priority-4 rating is borderline. Weakest factor: join rate in large, loose groups
  (classes of 25+).
- Self-entry through one link, where solo apps make one person type everyone in.
- Versus Hoera (the only live direct competitor found): no email at all (Hoera needs email + code), and a live calendar
  subscription instead of a weekly email. English-first.
- Calendar subscription (.ics) means reminders arrive in the calendar people already use.
  No app and no push permissions needed.
- Privacy: birth year optional and hidden by default. No contact import. Unguessable links.
- Cross-sell into `group-card` on the day, which strengthens both loops.
- **Risk:** low drama, so few people post it outside the group. Growth relies on chat-group spread, not
  public posts.

## Status

**Live: https://pb-birthday-circle.pages.dev** (brand: **Birthday Circle**). Product page + support on GitHub Pages:
https://janwan2003.github.io/birthday-circle/ (privacy policy at /privacy on the live site). Search Console: site verified
(META), added and sitemap submitted 2026-11-21 (`scripts/gsc.py`).

What exists and works (Cloudflare Pages + Functions + D1 `pb-birthday-circle`, free plan, no build step):
- Landing page with create form (group name, your name, birthday; or "I'm only organising"). One link per circle
  (`/c/<12-char random id>`).
- Circle page: join form for anyone without an entry on this device (name, day, month, optional year, "show my age"),
  list sorted by next birthday and grouped by month, "Next birthday" card, today banner with "Send a birthday wish",
  invite card (Share sheet / WhatsApp / Copy, full after create or join, compact on later visits),
  "+ Add someone" for children, partners, grandparents, "Make one for your other groups" (prefills the name: the
  joiner → creator step), "Your circles" list on the home page.
- Calendar feed `/c/<id>/birthdays.ics` (yearly all-day events, 29 Feb → last day of Feb, 9:00 alarm, 15-min edge cache),
  with one-tap Google / Apple (webcal) / Outlook subscribe links.
- Link preview per circle: "Uni friends · Birthday Circle", "4 birthdays so far · next up: Ben, today. Add yours in 10 seconds".
  Static og.png (1200x630).
- Permissions: random per-device token (only its SHA-256 stored); you edit/remove what you added; the creator can rename,
  edit/remove any entry and delete the circle; personal link (`#k=`) signs in another device and is stripped from the URL.
  Hidden birth years never leave the server (not in the API, not in the feed), and survive an organiser's edit.
- Rate limits per hashed IP in D1 (create 20/h, add 60/h, writes 300/h); max 300 birthdays per circle, 12 per device;
  circles inactive for 400 days are deleted; CSP + security headers; /c/ and /api/ disallowed in robots.txt and noindex.

Verified 2026-11-21:
- `node --test tests/unit/*.test.js`: 7/7 pass (next birthday incl. leap day, validation, sorting/ages, text, ICS escaping,
  75-octet folding, feed structure).
- `tests/e2e/run.mjs` in real Chromium (6 browser contexts, phone 390px and desktop 1280px) **passes locally and on
  production** (last prod run on deploy 84e1496c): create with validation, 3 joins, 29 Feb in a non-leap year refused,
  today-first ordering, hidden age not shown and not in the API, no hashes in the API, organiser sees Edit on all rows,
  calendar links, duplicate refused (409), add someone else, edit own entry, Ben's token gets 403 deleting Anna's
  entry, personal link on a second device, .ics has 5 events / leap rule / no hidden year, OG text before and after,
  rename, remove, organiser edit keeps the hidden year, "Your circles", delete → 404, privacy page, zero console errors.
  The test deletes its own circle; prod D1 had 0 circles / 0 members afterwards.
- Production feed parsed with the Python `icalendar` library: leap day, emoji, accents, `;` `"` `,` in names, alarms OK.
  HEAD and GET on the feed return `text/calendar`, `max-age=900`. Missing circle → 404 page.
- Create rate limit checked locally: the 21st create in an hour → 429.
- Screenshots checked by eye: landing (desktop), circle (phone, desktop), join form (phone), OG image, icon.
  Fixed: oversized invite card on return visits, wrapping calendar and "+ Add someone" buttons on phones.

Not covered yet: real iPhone/Android devices, a real Google/Apple/Outlook subscription to the production feed (the
links are built to each service's documented URL format but were not clicked through while signed in), WhatsApp/iMessage
preview rendering, other languages, per-circle OG image, load beyond a handful of users.

## Metrics

- 2026-11-21: launched today; 0 real circles (prod D1 `circles` = 0, `members` = 0 after the test cleaned up). Search
  Console: verified today, no data yet.

## Next steps

1. Subscribe to a real production feed in Google Calendar (signed in, via Claude-in-Chrome) and Apple Calendar; confirm events,
   the leap-day rule and refresh after a new join. This is the core promise and is untested end to end.
2. Per-circle OG image (names of the next 3 birthdays as a calendar card) so the chat preview shows the list itself.
3. Season hook: a "Family birthday calendar 2027" printable/PDF view of the circle (New Year is when people set this up).
4. SEO landing pages for the searches this serves: "family birthday calendar", "team birthday list", "class birthday
   list", "Facebook birthdays alternative". Measure in Search Console after 4-8 weeks.
5. Other languages (German, Dutch, Polish, Spanish) once there is any usage; Hoera is Dutch-first.
6. Optional reminders without a calendar (web push) only if users ask; the weekly email needs an operator account.

## Monetization plan

None until the operator enables it (charter rule 4). Later: team plan with Slack/Teams posting,
printable family birthday calendar (print-on-demand), and gift ideas. Never sell or expose birthdays.

## Log

- 2026-11-20 scout: created idea. Evidence from web searches (Digital Trends, InsideHook, Quartz,
  Replit forum, AlternativeTo, App Store). Did not open competitor sites or measure search volume.
- 2026-11-21 builder: checked evidence (Hoera alive but needs email + code and has no feed; Hurrayy stale), built and
  launched Birthday Circle on Pages + D1 (pb-birthday-circle), GitHub repo + Pages product page, Search Console verified
  + sitemap. Verified: unit 7/7, Chromium e2e passes locally and on prod deploy 84e1496c, prod feed parsed by `icalendar`,
  local rate limit 429 on the 21st create, screenshots at 390px and 1280px checked.
