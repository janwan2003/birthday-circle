---
slug: birthday-circle
stage: idea
priority: 4
url:
repo:
updated: 2026-11-20
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

## Our edge

- **Loop: needs others.**
- **K estimate ≈ 1.5** = 12 members per group × 65% who add their birthday (10 seconds, no account)
  × 20% who then start one for another group. Reason: the payoff is personal (you want *your*
  family's and team's birthdays too), and everyone belongs to several groups. This sits on the
  1.5 line, so the priority-4 rating is borderline. Weakest factor: join rate in large, loose groups
  (classes of 25+).
- Self-entry through one link, where solo apps make one person type everyone in.
- Calendar subscription (.ics) means reminders arrive in the calendar people already use.
  No app and no push permissions needed.
- Privacy: birth year optional and hidden by default. No contact import. Unguessable links.
- Cross-sell into `group-card` on the day, which strengthens both loops.
- **Risk:** low drama, so few people post it outside the group. Growth relies on chat-group spread, not
  public posts.

## Status

Idea only. Nothing built. Evidence is the web searches of 2026-11-20 listed above. Hoera's and
Hurrayy's current activity is not verified.

## Next steps

1. Open Hoera and Hurrayy and check whether they are alive, how join works, and what they lack.
2. Measure search demand ("birthday reminder", "group birthday calendar", "birthday list template").
3. Build `pb-birthday-circle` on Pages + D1: circle, member (name, day, month, optional year,
   device token). `/c/<id>.ics` calendar feed served by a Function and cached.
4. Weekly digest email only if a free sending route exists without an account (likely needs the
   operator). Start with .ics only.
5. Playwright e2e: create circle, 3 members join, list sorted by next birthday, .ics validates,
   at phone and desktop width.

## Monetization plan

None until the operator enables it (charter rule 4). Later: team plan with Slack/Teams posting,
printable family birthday calendar (print-on-demand), and gift ideas. Never sell or expose birthdays.

## Log

- 2026-11-20 scout: created idea. Evidence from web searches (Digital Trends, InsideHook, Quartz,
  Replit forum, AlternativeTo, App Store). Did not open competitor sites or measure search volume.
