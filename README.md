# Birthday Circle

A shared birthday list for group chats: one link, everyone adds their own birthday, everyone gets the list
and a calendar feed (`/c/<id>/birthdays.ics`) for Google, Apple and Outlook. No app, no sign-up.

Live: https://pb-birthday-circle.pages.dev · Product page: https://janwan2003.github.io/birthday-circle/

Cloudflare Pages + Functions + D1 (`pb-birthday-circle`), no build step.

    npx -y pnpm@9 install
    npx wrangler d1 execute pb-birthday-circle --local --file=schema.sql
    npx wrangler pages dev --port 18931 --ip 127.0.0.1
    node --test tests/unit/*.test.js
    BASE=http://127.0.0.1:18931 node tests/e2e/run.mjs     # real Chromium, phone + desktop
    node tools/render-images.mjs                            # og.png + icons
    BASE=http://127.0.0.1:18931 node tools/screens.mjs      # product-page screenshots (docs/screens, local only)
    npx wrangler pages deploy --branch main                 # needs CLOUDFLARE_* from the studio .env
    python3 scripts/gsc.py status                           # Search Console
