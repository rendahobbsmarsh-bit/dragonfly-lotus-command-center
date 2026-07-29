# DragonFly Lotus V7.4 — Stop Reload Loop

V7.3 completed the first cloud handshake, but reloaded the page every time cloud
data was applied. The reload restarted sign-in synchronization and created a loop.

## Correction

- Removes automatic `location.reload()` after cloud restoration
- Removes automatic reload after realtime updates
- Refreshes the DragonFly interface in place
- Keeps the cloud session and synchronization process stable
- Preserves realtime Mac, iPhone, and iPad updates
- Visible version marker is V7.4

## Install

```bash
unzip -o DragonFly_Lotus_v7_4_Stop_Reload_Loop.zip
git add .
git commit -m "DragonFly Lotus V7.4 - Stop cloud reload loop"
git push
```

After deployment:

1. Close the looping DragonFly tab or app.
2. Wait for GitHub Actions to turn green.
3. Open the permanent site again.
4. Hard refresh once with Command + Shift + R.
5. Confirm V7.4.
6. Open Cloud and allow up to 10 seconds for the first mirror.
7. The page should remain steady and display Cloud connected.
