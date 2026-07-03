# Bunting — birthday reminders with gift-idea notes

A small web app that tracks upcoming birthdays, sorted soonest-first, with a live
countdown and a notes field for gift ideas. Built with vanilla JS and Supabase
(Postgres + auth), designed to also ship as an iOS/Android app via Capacitor.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the schema** — open the SQL Editor in your project and run the contents
   of `schema.sql`. This creates the `birthdays` table and the Row Level
   Security policies that keep each user's data private.
3. **Get your keys** — go to Project Settings → API and copy the Project URL
   and the `anon` public key.
4. **Paste them into `supabase-client.js`.**
5. **Enable email confirmations (optional)** — by default Supabase requires
   email confirmation on sign-up. For local testing, you can turn this off in
   Authentication → Providers → Email, or just check the inbox you sign up with.
6. **Run it locally** — any static file server works, e.g.:
   ```
   npx serve .
   ```
   or just open `index.html` directly in a browser.

## About the anon key

The `anon` key in `supabase-client.js` is *meant* to be public — it's fine to
commit it to GitHub. It has no power on its own; every request it makes is
still checked against your Row Level Security policies in `schema.sql`. The
key you must never commit is the **service role key** (also in Project
Settings → API) — that one bypasses RLS entirely. This project never uses it.

## Project structure

```
bunting/
├── index.html            auth screen + main app screen
├── style.css              all styling
├── app.js                  auth, data, countdown, notes logic
├── supabase-client.js       your project URL + anon key
├── schema.sql                run once in Supabase's SQL editor
└── README.md
```

## Next steps

- **Deploy the website**: push this folder to a GitHub repo, then connect it
  to Netlify or Vercel for a free live URL.
- **Wrap as a mobile app**: install Capacitor (`npm init @capacitor/app`),
  point it at this folder, and it generates native iOS and Android projects
  that reuse this exact code.
