# Supabase setup (Fret Wars)

## 1) Create a Supabase project
- Create a new project in Supabase and wait for it to finish provisioning.

## 2) Create the `scores` table
- In Supabase: **SQL Editor**
- Paste and run `supabase/schema.sql`.

## 3) Add environment variables

### Local (`.env.local`)
Add:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never expose publicly)
- `BEEHIIV_API_KEY` (optional)
- `BEEHIIV_PUBLICATION_ID` (optional)

### Production (Vercel)
Add the same vars in **Project → Settings → Environment Variables**.

## 4) Test

- POST a score to `POST /api/scores`
- Fetch leaderboards:
  - `GET /api/leaderboard/all-time`
  - `GET /api/leaderboard/weekly`

