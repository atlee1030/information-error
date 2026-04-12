# Supabase Setup

## 1. Create A Project

Create a Supabase project at [supabase.com](https://supabase.com/).

## 2. Create The Table

Open the SQL Editor in Supabase and run:

`/Users/austinlee/Documents/GitHub/gd4-website/social-issues-schema.sql`

This creates:

- `social_issues` table
- read/insert/update policies for anonymous visitors
- an `updated_at` trigger

## 3. Copy Project Credentials

In Supabase:

1. Go to `Project Settings`
2. Open `API`
3. Copy:
   - `Project URL`
   - `anon public` key

## 4. Paste Them Here

Edit:

`/Users/austinlee/Documents/GitHub/gd4-website/supabase-config.js`

Fill in:

```js
window.SOCIAL_ISSUES_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_KEY",
  tableName: "social_issues"
};
```

## 5. Test

Open the homepage and add a social issue.

Expected behavior:

- new issue appears in the network
- refresh keeps it
- another browser/device sees it too
- repeated entries increase `count`
- repeated terms render larger

## Notes

- If `supabaseUrl` and `supabaseAnonKey` are blank, the site falls back to `localStorage` only.
- That fallback is local to one browser, not shared across visitors.
- Shared behavior starts only after the config is filled in.
