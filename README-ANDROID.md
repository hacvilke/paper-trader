# 📱 Paper Trader on Android (Galaxy A05 / A06 and friends)

Same pipeline as VortexEngine: **Gradle project + GitHub Actions → signed APK artifact**.

## One-time: put the game on GitHub

1. Create a repo (e.g. `paper-trader`), push this whole folder up.
2. Point the APK at your deployed game: edit
   `android/app/src/main/res/values/strings.xml` → `game_url`.
   (Any HTTPS deploy works: Vercel, your own box, the sandbox preview.)

## Build the APK

3. On GitHub: **Actions → Build Paper Trader APK → Run workflow** (it also
   auto-runs on every push).
4. When it finishes, download the **PaperTrader-APK** artifact →
   `app-release.apk`.

## Install on the phone

5. Copy `app-release.apk` to the Galaxy A05/A06 (USB, email, drive…).
6. Tap it → Android asks to allow installs from that app → allow → install.
7. Open **Paper Trader** — it runs the full game (market, mill, tape,
   badges, leaderboard). Progress is saved server-side per badge, so the
   APK, the browser, and any other device all share the same desk.

The APK is debug-signed (installable without Play Store). minSdk 24,
targetSdk 34 — tested config for Android 14 entry-level phones.

> Tip: the site is also a PWA — "Add to Home Screen" from Chrome installs
> instantly without any APK. The APK is the "real app" version.
