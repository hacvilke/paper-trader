# Paper Trader — desktop shell (Windows / macOS / Linux)

A ~2.5 MB Neutralino thin client: opens a paper loader sheet, then
streams the live game from Render. Updates arrive with every push —
the binary never needs rebuilding for game changes.

## Build (reproducible)

```bash
cd desktop-shell
npm i -D @neutralinojs/neu
npx neu update
npx neu build --release --embed-resources
# → dist/PaperTrader/PaperTrader-win_x64.exe  (single self-contained file)
```

`--embed-resources` is required for single-file distribution — without
it the exe needs `resources.neu` beside it (that's the "Neutralinojs
web page instead of the game" failure).
