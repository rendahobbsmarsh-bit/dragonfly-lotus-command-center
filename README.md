# DragonFly Lotus V8.1 — Unified Mirror Execution

V8.1 fixes the condition where the Cloud page reported that devices were aligned
but the visible workspace data did not update.

## Corrections

- Adds the legacy `dragonfly-lotus-v1` Today/core record to cloud payloads
- Uses one exact data-change event throughout the app
- Refreshes all workspaces immediately after cloud data arrives
- Mirrors deletions as well as additions and edits
- Refreshes Captain’s Log, Health, missions, Bliss, countdowns, Today, Flight Deck,
  and Connected Intelligence without reloading the page
- Adds an on-screen “Updated from cloud” confirmation
- Preserves the V8 zero-configuration sign-in experience

## Install

```bash
unzip -o DragonFly_Lotus_v8_1_Unified_Mirror_Execution.zip
git add .
git commit -m "DragonFly Lotus V8.1 - Unified mirror execution"
git push
```

After deployment:

1. Hard refresh the Mac once.
2. Open V8.1 on the iPhone and iPad and sign into the same account.
3. On the Mac, add `Mirror Test — Mac` to Captain’s Log.
4. Wait a few seconds or tap Synchronize Now on the receiving device.
5. Confirm the entry appears and the Cloud page reports `Updated from cloud`.
