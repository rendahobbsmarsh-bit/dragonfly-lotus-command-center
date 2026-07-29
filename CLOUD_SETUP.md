# DragonFly Lotus V6 — Cloud Setup

The application is built, but a private cloud database cannot be created inside
your personal Supabase account automatically. Complete these one-time steps.

## 1. Create the Supabase project

1. Go to Supabase and create a new project.
2. A suitable project name is `dragonfly-lotus`.
3. Store the database password somewhere secure.

## 2. Create the secure Cloud Mirror table

1. In Supabase, open **SQL Editor**.
2. Open `SUPABASE_SETUP.sql` from this V6 package.
3. Copy the entire script into SQL Editor.
4. Click **Run**.

The script creates one private row per signed-in user, enables Row Level
Security, and turns on realtime updates.

## 3. Allow the permanent DragonFly Lotus address

In Supabase:

1. Open **Authentication → URL Configuration**.
2. Set the Site URL to:

   `https://rendahobbsmarsh-bit.github.io/dragonfly-lotus-command-center/`

3. Add the same address to Redirect URLs.

## 4. Find the two browser-safe project values

Open **Project Settings → API** and copy:

- Project URL
- public anon key

Do not use or paste the `service_role` secret into DragonFly Lotus.

## 5. Connect DragonFly Lotus

1. Deploy V6 to GitHub Pages.
2. Open the new **Cloud** workspace.
3. Paste the Project URL and anon key.
4. Save Cloud Configuration.
5. Enter your email and request the secure sign-in link.
6. Open the email link on that device.
7. Use the same email and configuration on the Mac, iPhone, and iPad.

## How synchronization behaves

- Lotus continues to work offline.
- Local edits are queued while offline.
- When the cloud is empty, the first signed-in device uploads its local data.
- When another device already has newer cloud data, the newest saved copy wins.
- Before cloud data replaces local data, Lotus creates a local safety backup.
- Normal changes mirror automatically; **Synchronize Now** is also available.

## Privacy

The anon key identifies the Supabase project but does not bypass security.
Row Level Security limits each signed-in account to its own row. Never use the
Supabase service-role key in a browser application.
