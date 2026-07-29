# DragonFly Lotus V7.2 — Cloud State Correction

This correction separates three different conditions that V7.1 previously
combined:

1. Supabase configuration saved
2. Account signed in
3. Database mirror operational

## What changes

- A successful sign-in no longer falsely claims the data mirror is finished.
- Missing database setup now says:
  `Signed in • Database setup required`
- Missing Row Level Security policies now say:
  `Signed in • Security setup required`
- Offline status preserves the fact that the account is signed in.
- A successful data read/write changes the header to:
  `Cloud connected`
- Specific setup guidance remains visible instead of being overwritten.
- `DragonFlyCloud.status()` is available in the browser console for diagnostics.
- Visible version marker is V7.2.

## Install

```bash
unzip -o DragonFly_Lotus_v7_2_Cloud_State_Correction.zip
git add .
git commit -m "DragonFly Lotus V7.2 - Cloud state correction"
git push
```

After deployment:

1. Reload with Command + Shift + R.
2. Sign in.
3. Read the exact Cloud status.
4. If it says database setup required, run `SUPABASE_SETUP.sql` in Supabase.
5. Select Synchronize Now.
6. When it says Cloud connected, sign into the other devices and begin the
   one-week field test.
