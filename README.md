# DragonFly Lotus V7.1 — Cloud Initialization Patch

This patch fixes the Cloud page crash:

`Cannot read properties of null (reading 'length')`

## Fixes

- Safely handles an empty Cloud Activity Log
- Prevents the Cloud setup process from stopping during page load
- Accepts Supabase `sb_publishable_...` browser keys
- Rejects `sb_secret_...` and service-role keys
- Refuses to initialize if a secret key was saved accidentally
- Prevents the service worker from trying to cache Chrome-extension requests
- Updates the visible badge to V7.1

## Install

```bash
unzip -o DragonFly_Lotus_v7_1_Cloud_Initialization_Patch.zip
git add .
git commit -m "DragonFly Lotus V7.1 - Cloud initialization patch"
git push
```

After the deployment turns green:

1. Reload the permanent site with Command + Shift + R.
2. Open Cloud.
3. If the app reports an unsafe key, click **Remove Configuration**.
4. Save the Supabase Project URL and the full `sb_publishable_...` key.
5. Create or sign into the account.

## Security warning

Never place an `sb_secret_...` or service-role key in DragonFly Lotus.
Those keys are server-only and bypass Row Level Security.
