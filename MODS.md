# Mods & Contributions — the house rules

Paper Trader is **GPLv3** (see `LICENSE`). Plain English for this project:

## What anyone may do
- Play it, host their own copy, stream it, use it commercially (their own
  hosting, their own community).
- **Fork it / redistribute it** — but GPLv3 requires they keep the
  copyright notice and license, publish their source, and license
  changes under GPLv3 too. Your name stays in the paper trail: that is
  the "signature on redistribution."

## How mods work here
- **Core stays curated.** Pull requests to core game systems (engine,
  economy, UI kit) are read as *proposals*, not merge-on-sight.
- **Add-ons first.** The right shape for a community contribution is an
  **addon mod**: a self-contained module that hooks the game without
  rewriting it — new industry packs, news flavor packs, challenge rules,
  chart toys. PRs labelled `mod:` get reviewed fast.
- Mods must keep the paper identity, work on a phone, and be **off**
  cheap devices' critical path (eco mode first).

## Technical shape (the honest answer for an APK game)
The APK is a thin WebView shell that loads the game **live from the
server** — there is nothing on the phone to plugin into. So mods ship
**server-side**:

1. A mod is a small JS module registered in the game's mod list
   (sandboxed, no raw network access, no storage access).
2. Players get a "mods" panel: toggle a mod on → it loads next refresh.
3. Because the game streams from Render, **a merged mod updates every
   device instantly — no APK rebuild, same as everything else.**

Client-side injection (userscripts) technically exists but is fragile,
unsafe, and unsupported. Don't.

## Desktop (.exe)?
Not planned as a build target. The game runs in any browser, and
Chrome/Edge can already install it as a desktop app (PWA) with zero
code. Mod managers like **Vortex** manage mods for *installed native
games* — there's no .exe here for it to hook, so it doesn't apply.
