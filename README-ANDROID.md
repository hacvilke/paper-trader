# 📱 Paper Trader on Android (Galaxy A05 / A06 and friends)

Same pipeline as VortexEngine: **Gradle project + GitHub Actions → signed APK artifact**.

## One-time: put the game on GitHub

1. Repo: **https://github.com/hacvilke/paper-trader** (already live — CI runs on every push).
2. Point the APK at your deployed game: edit
   `android/app/src/main/res/values/strings.xml` → `game_url`.
   (Any HTTPS deploy works: Vercel, your own box, the sandbox preview.)

## Build the APK

3. The app now defaults to **https://hacvilke.github.io/paper-trader** (static,
   permanent, per-device saves). To re-point it (e.g. at your Render server for
   shared accounts/leaderboard): menu (⋮) → **server address** → paste URL.
   No rebuild ever needed.

4. On GitHub: **Actions → Build Paper Trader APK → Run workflow** (it also
   auto-runs on every push).
5. When it finishes, download the **PaperTrader-APK** artifact →
   `app-release.apk`.

## Install on the phone

6. Copy `app-release.apk` to the Galaxy A05/A06 (USB, email, drive…).
7. Tap it → Android asks to allow installs from that app → allow → install.
8. Open **Paper Trader** — it runs the full game (market, mill, tape,
   badges, leaderboard). Progress is saved server-side per badge, so the
   APK, the browser, and any other device all share the same desk.

The APK is debug-signed (installable without Play Store). minSdk 24,
targetSdk 34 — tested config for Android 14 entry-level phones.

## Full multiplayer later (shared badges / wire / leaderboard)

The GitHub Pages build plays great on one device (saves live in the app).
For the shared file cabinet across phones, deploy the **full server** free:
create a web service on render.com from this repo — it auto-reads
`render.yaml` (Docker). Paste the URL into the APK menu. That's it.

> Tip: the site is also a PWA — "Add to Home Screen" from Chrome installs
> instantly without any APK. The APK is the "real app" version.

## Current build

- v1.0.0 APKs are committed under `apk/` (release + debug) and attached to the
  first Actions run. Rebuild anytime: Actions → Build Paper Trader APK.
- The app points at the deployed game (see strings.xml). All accounts, saves
  and the live leaderboard live on that server — phone and browser share one desk.
