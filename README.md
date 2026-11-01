# 📰 Paper Trader

A paper-and-pencil trading floor in your pocket: buy, sell, short real-ish
stocks with bid/ask spreads, fees, market impact, circuit breakers and
trend-matching news. Found your own company, build it, and ring the IPO
bell — your ticker goes public on **everyone's** board. Live multiplayer
leaderboard, a shared rumor wire, order slips the clerk fills while
you're away, dividends every five days, and a stick-figure Magnate who
walks in with a check when your net worth makes the news.

Everything is drawn: rough ink, sticky notes, torn edges, check-signing
ceremonies. Eco mode keeps it smooth on cheap phones.

## Play

- **APK (Android):** latest build in `apk/` — installs over old versions,
  defaults to the live server. The app streams the game from the server,
  so updates arrive without reinstalling anything.
- **Web:** https://paper-trader-h1ko.onrender.com (auto-deploys on push)
- **Mirror:** https://hacvilke.github.io/paper-trader/ (GitHub Pages)

## Server setup (Render + Supabase)

In Render → your web service → **Environment**:

```
DATABASE_URL = <Supabase Connect → Session pooler URI, port 5432,
                password embedded, suffixed ?sslmode=no-verify>
```

Tables (`accounts, saves, feed, biz`) auto-create on first boot. Badges,
saves, the wire, the ticker registry and player IPOs then survive deploys
and cold starts. Without `DATABASE_URL` the game falls back to a local
file cabinet (resets on deploys).

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

- `lib/game.ts` — the whole engine (market, factory, slips, milestones)
- `app/api/*` — auth / save / feed / leaderboard / biz registry / ipos
- `components/paper-ui` — the design system (PaperSheet, PaperButton,
  PaperChart, the Magnate, check ceremonies)
- `android/` — WebView shell ( Gradle, `assembleRelease`); CI builds the
  APK on every push to `main`

---

© hacvilke — Paper Trader. All rights reserved. No commercial use or
redistribution without permission.
