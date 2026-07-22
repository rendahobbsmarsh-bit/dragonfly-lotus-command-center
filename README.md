# DragonFly Lotus Command Center v2.1

## Morning Intelligence release

This version adds a live Morning Intelligence panel that reads the existing
Command Center data and turns it into:

- Today's Mission
- Top Three
- Upcoming preparation
- Today's Observation and next move

It uses the same localStorage keys as v2.0, so appointments, health entries,
countdowns, mission data, flight operations and Dragonfly Bliss information
remain on the same browser/device.

## Install in Codespaces

1. Upload this ZIP into the repository root.
2. In Terminal run:

```bash
unzip DragonFly_Lotus_Command_Center_v2_1_Morning_Intelligence.zip
```

3. When asked to replace files, type `A` and press Return.
4. Refresh the running Command Center.
5. Verify the Morning Intelligence panel appears beneath the mode selector.

## Commit after testing

```bash
git add index.html styles.css app.js README.md
git commit -m "DragonFly Lotus v2.1 - Morning Intelligence"
git push
```
