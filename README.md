# DragonFly Lotus V7.3 — First Mirror Handshake

This patch fixes the Cloud page remaining on:

`Signed in. Checking the DragonFly data mirror…`

## Corrections

- The first database request now has a 10-second timeout.
- An empty cloud automatically receives the current device as the first master copy.
- Realtime listening starts only after the first read/write succeeds.
- Realtime startup cannot hold the sign-in screen indefinitely.
- First-mirror progress messages explain what DragonFly Lotus is doing.
- Successful completion displays `Cloud connected`.
- A timeout provides a retry message instead of spinning forever.
- Visible version marker is V7.3.

## Install

```bash
unzip -o DragonFly_Lotus_v7_3_First_Mirror_Handshake.zip
git add .
git commit -m "DragonFly Lotus V7.3 - First mirror handshake"
git push
```

After deployment:

1. Reload the permanent site with Command + Shift + R.
2. Confirm the badge says V7.3.
3. Open Cloud and sign in.
4. Wait up to 10 seconds.
5. The first device should upload automatically and display `Cloud connected`.
6. Sign in on the other devices with the same account.
