# DragonFly Lotus V3.1 — Permanent Home

V3.1 turns DragonFly Lotus into a GitHub Pages progressive web app.

## What this solves

- No Python server to restart
- No port 8000
- No Public/Private port setting
- No temporary Codespaces preview address
- A permanent GitHub Pages URL
- Add-to-Home-Screen support on iPhone and iPad
- Basic offline app-shell support after the first successful load

## Install in Codespaces

Upload this ZIP to the repository root, then run:

```bash
unzip -o DragonFly_Lotus_v3_1_GitHub_Pages_PWA.zip
```

Commit and push:

```bash
git add .
git commit -m "DragonFly Lotus V3.1 - Permanent GitHub Pages home"
git push
```

## Enable GitHub Pages once

In the GitHub repository:

1. Open Settings.
2. Select Pages.
3. Under Build and deployment, choose **GitHub Actions**.
4. Open the Actions tab and wait for the Pages deployment to finish.

The permanent site should then be:

`https://rendahobbsmarsh-bit.github.io/dragonfly-lotus-command-center/`

## Phone and iPad

Open the permanent URL in Safari, tap Share, and choose Add to Home Screen.

## Important data note

The website will be permanent, but browser data is still local to each device.
Phone, iPad, and Mac will not mirror until cloud sync is added.
