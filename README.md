# DragonFly Lotus V6.0 — Cloud Mirror

V6 adds secure, local-first cross-device mirroring using Supabase.

## Included

- New **Cloud** workspace
- Passwordless email sign-in
- Automatic mirroring of DragonFly localStorage data
- Mac, iPhone, and iPad support
- Realtime updates from other devices
- Offline queueing and reconnect synchronization
- Latest-write-wins conflict handling
- Safety backup before remote data replaces local data
- Manual **Synchronize Now**
- Cloud activity log and visible connection status
- `SUPABASE_SETUP.sql` with Row Level Security policies
- `CLOUD_SETUP.md` with one-time setup instructions

## Important

The cloud code is complete, but it cannot know your personal Supabase Project
URL or public anon key until you create the private project and paste those
values into the Cloud workspace.

## Install in Codespaces

```bash
unzip -o DragonFly_Lotus_v6_0_Cloud_Mirror.zip
git add .
git commit -m "DragonFly Lotus V6.0 - Cloud Mirror"
git push
```

Wait for GitHub Pages to deploy, reload the permanent website, then open the
**Cloud** workspace and follow `CLOUD_SETUP.md`.

## V6 confirmation markers

- `V5.0` may still appear as the UI foundation version chip.
- A new **Cloud** workspace appears in navigation.
- Header status says **Cloud not connected** until configured.
- The Cloud workspace contains setup, email sign-in, sync status, and activity.

## Security

Use only the Supabase public anon key in the browser. Never paste the
`service_role` key into DragonFly Lotus.
