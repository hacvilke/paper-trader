/**
 * The game engine v4 — a realistic-but-forgiving market simulator.
 *
 * Realistic bits:
 *  • bid/ask spread per stock — you buy at the ASK, sell at the BID
 *  • market impact — big orders push the price against you
 *  • volatility clustering — calm stretches and wild stretches
 *  • per-stock trends + a market-wide MOOD that lifts or drags all boats
 *  • circuit breakers — a >8% single-tick move halts that stock briefly
 *  • the PAPER 500 index — your report card
 *
 * Forgiving bits:
 *  • tiny fixed paperwork fee ($0.99), gentle spreads, gentle impact
 *  • no margin, no expiry — you can't blow up past zero
 */

export const START_CASH = 10_000;
export const FEE = 0.99;
export const DAILY_LOAN_RATE = 0.005; // interest charged at each closing bell
// ---- shorts ----
export const SHORT_CAP = 0.25; // a new short position ≤ 25% of cash + holdings
export const MARGIN_CALL_AT = 0.55; // forced cover when liability > 55% of assets
export const SHORT_BORROW_RATE = 0.002; // daily borrow fee on short liability
export const REWARD_MIN = 15;
export const REWARD_MAX = 60;

// ---- the factory (company management) ----
export const FACT_FAIR_PRICE = 3.0;
export const FACT_WAGE = 2.0; // per worker per day
export const FACT_MAINT = 3.0; // per machine per day
export const FACT_HIRE_FEE = 15;
export const FACT_FIRE_FEE = 8;
export const FACT_ADVERT_COST = 30;
export const FACT_BONUS_PER_WORKER = 4;
export const FACT_EMERGENCY_AID = 40;
export const IPO_DAY = 10; // business days before you may list
export const IPO_PROFIT = 750; // lifetime net profit needed
export const FOUNDER_SHARES = 60;
export const PUBLIC_SHARES = 40;
export const UNDERWRITER_CUT = 0.03; // Moorthy's fee for the confetti
export const SMUD_DRIFT = 0.0003; // the rival mill's per-tick house edge (~+0.8%/day)

// ---- the wider exchange: procedural stocks that come & go ----
export const PROC_MAX = 12; // max procedural listings at once

export type FactNews = { id: number; day: number; text: string; tone: "good" | "bad" | "info" };

export type Factory = {
  cash: number;
  reams: number;
  price: number;
  machines: number;
  workers: number;
  morale: number; // 0..100
  rep: number; // 0..100
  ads: number; // days of ad boost left
  day: number;
  revenue: number;
  costs: number;
  reamsSold: number;
  emergencies: number;
  history: number[]; // daily net profit
  news: FactNews[];
  listed: boolean;
  founder: number; // shares you hold
  publicShares: number;
  ipoPrice: number; // FOLD7 & SMUD both started here
};

export function machineCost(machines: number) {
  return Math.round(120 * Math.pow(1.4, machines - 1));
}

export function priceWord(price: number) {
  const r = price / FACT_FAIR_PRICE;
  if (r < 0.8) return "bargain";
  if (r < 1.2) return "fair";
  if (r < 1.7) return "premium";
  return "greedy";
}
export const TICKS_PER_DAY = 26;
export const START_MIN = 9 * 60 + 30;
export const MIN_PER_TICK = 15;
export const GAME_VERSION = 10;

export type ShortPos = { qty: number; avg: number }; // avg = entry (sold-at) price
export const HALT_MOVE = 0.08;

export type Stock = {
  sym: string;
  name: string;
  blurb: string;
  price: number; // mid price
  prev: number;
  dayOpen: number;
  high: number;
  low: number;
  vol: number; // base volatility
  volNow: number; // clustered volatility
  spreadPct: number; // half-spread as % of mid (total spread = 2x)
  beta: number; // sensitivity to market mood
  drift: number;
  trend: number; // slow per-stock trend, random-walked
  haltSteps: number; // >0 = trading halted
  sessionVol: number; // shares traded today (your trades)
  shockMag: number;
  shockSteps: number;
  hist: number[];
  proc?: boolean; // procedural listing — can go bankrupt
  entry?: number; // IPO price on our tape
  doom?: number; // >0 = bankruptcy in progress; 0 = delist now
};

export type Holding = { qty: number; avg: number };

export type TradeSide = "BUY" | "SELL" | "SHORT" | "COVER";

export type Trade = {
  id: number;
  day: number;
  time: string;
  side: TradeSide;
  sym: string;
  qty: number;
  price: number; // executed price (ask or bid)
  total: number;
};

export type NewsItem = {
  id: number;
  day: number;
  time: string;
  text: string;
  sym: string;
  tone: "good" | "bad";
};

export type Speed = 0 | 1 | 2 | 4;

export type GameState = {
  v: number;
  tick: number;
  cash: number;
  stocks: Stock[];
  holdings: Record<string, Holding>;
  trades: Trade[];
  news: NewsItem[];
  netWorthHist: number[];
  indexHist: number[];
  moodDrift: number;
  moodSteps: number;
  speed: Speed;
  realized: number;
  debt: number;
  borrowedTotal: number;
  repaidTotal: number;
  interestPaid: number;
  feesPaid: number;
  spentTotal: number;
  receivedTotal: number;
  shorts: Record<string, ShortPos>;
  shortProceedsTotal: number;
  coverCostTotal: number;
  shortFeesPaid: number;
  bonusesTotal: number;
  pendingCheck: { amount: number; day: number } | null;
  factory: Factory;
  seq: number;
  tut: boolean;
};

export type Action =
  | { type: "TICK" }
  | { type: "BUY"; sym: string; qty: number }
  | { type: "SELL"; sym: string; qty: number }
  | { type: "SPEED"; speed: Speed }
  | { type: "RESET" }
  | { type: "TUT_OFF" }
  | { type: "TUT_ON" }
  | { type: "BORROW"; amt: number }
  | { type: "REPAY"; amt: number }
  | { type: "SHORT"; sym: string; qty: number }
  | { type: "COVER"; sym: string; qty: number }
  | { type: "CLAIM_CHECK" }
  | { type: "FACT_PRICE"; price: number }
  | { type: "FACT_MACHINE" }
  | { type: "FACT_HIRE" }
  | { type: "FACT_FIRE" }
  | { type: "FACT_BONUS" }
  | { type: "FACT_ADVERT" }
  | { type: "FACT_PAY_ME"; amt: number }
  | { type: "FACT_INJECT"; amt: number }
  | { type: "FACT_IPO" }
  | { type: "HYDRATE"; state: GameState };

const DEFS: Array<
  Pick<Stock, "sym" | "name" | "blurb" | "price" | "vol" | "drift" | "spreadPct" | "beta">
> = [
  { sym: "PPRC", name: "Papyrus Corp", blurb: "The blue chip of reams.", price: 42.5, vol: 1.0, drift: 0.02, spreadPct: 0.12, beta: 1.2 },
  { sym: "FOLD", name: "Fold & Sons", blurb: "Origami-adjacent logistics.", price: 18.25, vol: 1.5, drift: 0.03, spreadPct: 0.18, beta: 1.0 },
  { sym: "INKW", name: "InkWell Inc.", blurb: "Controls the pens. Controls everything.", price: 77.0, vol: 1.2, drift: 0.012, spreadPct: 0.1, beta: 0.8 },
  { sym: "STPL", name: "Staple Industries", blurb: "Holding it together since 1951.", price: 12.4, vol: 0.8, drift: 0.015, spreadPct: 0.15, beta: 0.7 },
  { sym: "SHRP", name: "Sharpen & Co.", blurb: "The pencil-pushers' pick.", price: 33.75, vol: 1.4, drift: 0.025, spreadPct: 0.16, beta: 1.1 },
  { sym: "MEMO", name: "MemoPad Ltd", blurb: "Sticky notes, sticky gains.", price: 55.6, vol: 1.9, drift: 0.02, spreadPct: 0.2, beta: 1.3 },
  { sym: "CRNG", name: "Cringold Paper", blurb: "Cheap pulp, wild swings.", price: 8.9, vol: 2.6, drift: 0.01, spreadPct: 0.45, beta: 1.6 },
  { sym: "WAXS", name: "Waxseal Systems", blurb: "Blockchain, but with wax.", price: 64.2, vol: 2.2, drift: 0.035, spreadPct: 0.3, beta: 1.4 },
];

/** baseline prices, for the PAPER 500 index */
export const BASE: Record<string, number> = Object.fromEntries(DEFS.map((d) => [d.sym, d.price]));

const NEWS_POS = [
  "{name} unveiled a 100% recyclable quarterly report. Market loved the vibes.",
  "Insiders at {name} caught buying back shares with actual cash.",
  "{name} upgraded to 'Strong Buy' by Moorthy's, a very trusted moose.",
  "Merger rumors: {name} × MemoPad — sources say it's sticky.",
  "{name} wins the city contract for every printer within 4 blocks.",
  "A celebrity was seen journaling with {name} products. Demand spikes.",
  "{name} announces a dividend payable in crisp A4 sheets.",
  "{name} beats earnings — analysts call it 'unpressed potential'.",
];

const NEWS_NEG = [
  "{name} folds under pressure — paper trails everywhere.",
  "Auditors find a coffee stain on {name}'s balance sheet.",
  "Jam incident in {name}'s HQ printer; operations halted.",
  "{name} CEO caught doodling during the earnings call.",
  "Paper-cut lawsuit filed against {name}; shares bleed.",
  "{name} downgraded to 'Damp Squib' by Moorthy's, a very trusted moose.",
  "Rival startup 'Digital Memo' threatens {name}'s whole thing.",
  "{name} accidentally shredded its own quarterly guidance.",
];

export const round2 = (n: number) => Math.round(n * 100) / 100;
const fmtMoneySign = (n: number) => `$${n.toFixed(2)}`;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Deterministic PRNG so SSR and client agree on the first paint. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussStd() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ---------- market microstructure helpers ---------- */

/** the price you can sell at */
export const bidOf = (s: Stock) => round2(s.price * (1 - s.spreadPct / 200));
/** the price you can buy at */
export const askOf = (s: Stock) => round2(s.price * (1 + s.spreadPct / 200));

/** gentle market impact for `qty` shares — capped at 2% */
export function impactOf(s: Stock, qty: number) {
  return Math.min(0.02, (qty / 500) * (s.spreadPct / 100) * 0.5);
}

export function volWord(s: Stock) {
  const r = s.volNow / s.vol;
  if (r < 0.7) return "calm";
  if (r < 1.15) return "steady";
  if (r < 1.8) return "jumpy";
  return "wild";
}

export function moodWord(moodDrift: number) {
  if (moodDrift > 0.0022) return "euphoric";
  if (moodDrift > 0.0008) return "upbeat";
  if (moodDrift > -0.0008) return "quiet";
  if (moodDrift > -0.0022) return "nervous";
  return "panicky";
}

export function fmtK(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function fmtMoney(n: number) {
  const sign = n < 0 ? "−" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function initialGame(): GameState {
  const rnd = mulberry32(20261030);
  const stocks: Stock[] = DEFS.map((d) => {
    let p = d.price * (0.94 + rnd() * 0.06);
    const hist: number[] = [];
    for (let i = 0; i < 42; i++) {
      const u = rnd();
      const g = Math.sqrt(-2 * Math.log(u || 1e-9)) * Math.cos(2 * Math.PI * rnd());
      p = Math.max(0.5, p * (1 + d.vol * 0.005 * g));
      hist.push(round2(p));
    }
    const price = hist[hist.length - 1];
    return {
      ...d,
      price,
      prev: hist[hist.length - 2],
      dayOpen: price,
      high: price,
      low: price,
      volNow: d.vol,
      trend: 0,
      haltSteps: 0,
      sessionVol: 0,
      shockMag: 0,
      shockSteps: 0,
      hist,
    };
  });

  const indexHist = Array.from({ length: 42 }, (_, i) => {
    const avg = stocks.reduce((a, s) => a + s.hist[i] / BASE[s.sym], 0) / stocks.length;
    return round2(100 * avg);
  });

  return {
    v: GAME_VERSION,
    tick: 0,
    cash: START_CASH,
    stocks,
    holdings: {},
    trades: [],
    news: [],
    netWorthHist: [START_CASH],
    indexHist,
    moodDrift: 0,
    moodSteps: 0,
    speed: 1,
    realized: 0,
    debt: 0,
    borrowedTotal: 0,
    repaidTotal: 0,
    interestPaid: 0,
    feesPaid: 0,
    spentTotal: 0,
    receivedTotal: 0,
    shorts: {},
    shortProceedsTotal: 0,
    coverCostTotal: 0,
    shortFeesPaid: 0,
    bonusesTotal: 0,
    pendingCheck: null,
    factory: {
      cash: 150,
      reams: 40,
      price: 3.0,
      machines: 1,
      workers: 2,
      morale: 60,
      rep: 40,
      ads: 0,
      day: 0,
      revenue: 0,
      costs: 0,
      reamsSold: 0,
      emergencies: 0,
      history: [],
      listed: false,
      founder: 0,
      publicShares: 0,
      ipoPrice: 0,
      news: [
        {
          id: 1,
          day: 0,
          text: "Moorthy's repossessed Foldville Mills № 7 and handed YOU the keys. Make paper. Make money. Pay yourself.",
          tone: "info",
        },
      ],
    },
    seq: 1,
    tut: true,
  };
}

/** total market value of your long holdings */
export function holdingsValue(s: GameState) {
  let v = 0;
  for (const [sym, h] of Object.entries(s.holdings)) {
    const st = s.stocks.find((x) => x.sym === sym);
    if (st) v += h.qty * st.price;
  }
  return round2(v);
}

export function netWorth(s: GameState) {
  let v = s.cash;
  for (const [sym, h] of Object.entries(s.holdings)) {
    const st = s.stocks.find((x) => x.sym === sym);
    if (st) v += h.qty * st.price;
  }
  // shorts: the sale proceeds are already in cash — subtract what the
  // owed shares cost at the current price, and the P/L falls out naturally
  for (const [sym, sh] of Object.entries(s.shorts)) {
    const st = s.stocks.find((x) => x.sym === sym);
    if (st) v -= sh.qty * st.price;
  }
  return round2(v - (s.debt ?? 0));
}

/** biggest short you're allowed to open: 25% of cash + holdings, priced now */
export function maxShortQty(cash: number, holdVal: number, price: number) {
  if (!(price > 0)) return 0;
  return Math.max(0, Math.floor(((cash + holdVal) * SHORT_CAP) / price));
}

/** amount in check words: 42.5 → "forty-two and 50/100 dollars" */
export function amtWords(n: number): string {
  const ones = [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
    "eighteen", "nineteen",
  ];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const under1000 = (x: number): string => {
    let out = "";
    if (x >= 100) {
      out += ones[Math.floor(x / 100)] + " hundred";
      x %= 100;
      if (x > 0) out += " ";
    }
    if (x >= 20) {
      out += tens[Math.floor(x / 10)];
      if (x % 10 > 0) out += "-" + ones[x % 10];
    } else if (x > 0) {
      out += ones[x];
    }
    return out;
  };
  const dollars = Math.floor(Math.max(0, n));
  const cents = Math.round((Math.max(0, n) - dollars) * 100);
  const parts: string[] = [];
  const thousands = Math.floor(dollars / 1000);
  if (thousands > 0) parts.push(`${under1000(thousands)} thousand`);
  const rest = dollars % 1000;
  if (rest > 0 || parts.length === 0) parts.push(under1000(rest));
  return `${parts.join(" ")} and ${String(cents).padStart(2, "0")}/100 dollars`;
}

export const dayOf = (tick: number) => Math.floor(tick / TICKS_PER_DAY) + 1;

export function timeOf(tick: number) {
  const m = (START_MIN + (tick % TICKS_PER_DAY) * MIN_PER_TICK) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  const ap = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${mm} ${ap}`;
}

/** push a gentle price impact from your own order into the books */
function applyImpact(
  stocks: Stock[],
  sym: string,
  qty: number,
  dir: 1 | -1
): Stock[] {
  return stocks.map((s) => {
    if (s.sym !== sym) return s;
    const imp = impactOf(s, qty) * dir;
    const price = Math.max(0.4, round2(s.price * (1 + imp)));
    const hist = [...s.hist.slice(0, -1), price];
    return {
      ...s,
      price,
      hist,
      high: Math.max(s.high, price),
      low: Math.min(s.low, price),
      sessionVol: s.sessionVol + qty,
    };
  });
}

const FACT_EVENTS: Array<{ text: string; tone: "good" | "bad" | "info"; apply: (f: Factory) => void }> = [
  { text: "City hall ordered 60 reams of letterhead. Paid on the spot, rep up.", tone: "good", apply: (f) => { f.cash += 60; f.rep = Math.min(100, f.rep + 3); } },
  { text: "The local school bought 20 reams at a premium. Teachers never haggle.", tone: "good", apply: (f) => { f.cash += Math.round(20 * f.price * 1.2 * 100) / 100; f.reams = Math.max(0, f.reams - 20); f.reamsSold += 20; f.revenue = Math.round((f.revenue + 20 * f.price * 1.2) * 100) / 100; } },
  { text: "A paperfluencer posted your mill. Free ads for 2 days!", tone: "good", apply: (f) => { f.ads += 2; } },
  { text: "Supplier overstock sale: +25 reams of free pulp. Smells like victory.", tone: "good", apply: (f) => { f.reams += 25; } },
  { text: "Machine № 1 jammed. Ten reams came out as modern art.", tone: "bad", apply: (f) => { f.reams = Math.max(0, f.reams - 10); } },
  { text: "Paper-cut lawsuit settled out of court. It cost you.", tone: "bad", apply: (f) => { f.cash = Math.max(0, f.cash - 25); } },
  { text: "The coffee machine broke. Morale says the office is now a lie.", tone: "bad", apply: (f) => { f.morale = Math.max(0, f.morale - 8); } },
  { text: "Union picnic approved. Money well spent, morale up.", tone: "info", apply: (f) => { f.cash = Math.max(0, f.cash - 12); f.morale = Math.min(100, f.morale + 6); } },
];

const PROC_A = ["Apex", "Bright", "Cedar", "Dover", "Echo", "Fable", "Gilded", "Harbor", "Ivory", "Juniper", "Kestrel", "Lumen", "Maple", "Nimbus", "Onyx", "Pinnacle", "Quill", "Ridge", "Summit", "Thistle", "Umber", "Verdant", "Willow", "Zephyr"];
const PROC_B = ["Stationery", "Pulp", "Fibers", "Press", "Cartage", "Mills", "Bindery", "Coatings", "Supplies", "Logistics", "Paperworks", "Packaging"];

/** spin up a fresh procedural company: some gems, some duds, some doom */
export function makeProcStock(existingSyms: string[]): Stock {
  const name = `${PROC_A[Math.floor(Math.random() * PROC_A.length)]} ${PROC_B[Math.floor(Math.random() * PROC_B.length)]}`;
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "");
  let sym = "";
  for (const ch of letters) {
    if (sym.length >= 4) break;
    if (!sym.includes(ch)) sym += ch;
  }
  while (sym.length < 3) sym += String.fromCharCode(65 + Math.floor(Math.random() * 26));
  let n = 2;
  let candidate = sym.slice(0, 4);
  while (existingSyms.includes(candidate)) candidate = (sym + n++).slice(0, 4);
  sym = candidate;

  const roll = Math.random();
  const tier = roll < 0.4 ? "blue" : roll < 0.78 ? "growth" : "junk";
  const cfg =
    tier === "blue"
      ? { price: 30 + Math.random() * 60, vol: 0.8 + Math.random() * 0.6, drift: 0.01 + Math.random() * 0.02, sp: 0.14 + Math.random() * 0.1 }
      : tier === "growth"
        ? { price: 9 + Math.random() * 30, vol: 1.4 + Math.random() * 0.8, drift: -0.005 + Math.random() * 0.045, sp: 0.2 + Math.random() * 0.15 }
        : { price: 1.6 + Math.random() * 6, vol: 2.2 + Math.random() * 0.8, drift: -0.02 + Math.random() * 0.04, sp: 0.4 + Math.random() * 0.3 };

  const px = round2(cfg.price);
  const histSeed = Array.from({ length: 18 }, (_, i) => round2(px * (1 + 0.012 * Math.sin(i / 2.4) + (Math.random() - 0.5) * 0.02)));
  BASE[sym] = px;
  return {
    sym,
    name,
    blurb: "Listed on the side window of Moorthy's. Ask about the fundamentals.",
    price: px,
    prev: histSeed[histSeed.length - 2],
    dayOpen: px,
    high: px,
    low: px,
    vol: cfg.vol,
    volNow: cfg.vol,
    spreadPct: cfg.sp,
    beta: 0.7 + Math.random() * 0.9,
    drift: cfg.drift,
    trend: 0,
    haltSteps: 0,
    sessionVol: 0,
    shockMag: 0,
    shockSteps: 0,
    hist: histSeed,
    proc: true,
    entry: px,
  };
}

export const factAvgNet = (f: Factory) =>
  f.history.length ? round2(f.history.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, f.history.length)) : 0;

/** fundamentals-based fair price for one FOLD7 share */
export function fairSharePrice(f: Factory) {
  return Math.max(1, round2((f.cash + 30 * factAvgNet(f) + f.rep) / 100));
}

export function ipoReady(f: Factory) {
  return !f.listed && f.day >= IPO_DAY && f.revenue - f.costs >= IPO_PROFIT;
}

/** one business day at the factory, run at every closing bell */
export function simFactory(f0: Factory, day: number): Factory {
  const f: Factory = {
    ...f0,
    morale: f0.morale,
    rep: f0.rep,
    history: [...f0.history],
    news: [...f0.news],
  };
  const note = (text: string, tone: "good" | "bad" | "info") => {
    f.news = [{ id: Math.floor(Math.random() * 1e9), day, text, tone }, ...f.news].slice(0, 6);
  };

  // production
  const staffing = Math.min(1, f.workers / Math.max(1, f.machines * 2));
  const strike = f.morale < 25;
  let made = Math.round(f.machines * 22 * staffing * (0.6 + f.morale / 250));
  if (strike) made = Math.round(made / 2);
  f.reams += made;

  // demand & sales
  const pf = Math.min(2.4, Math.max(0.12, Math.pow(FACT_FAIR_PRICE / f.price, 1.35)));
  const demand = Math.round((14 + f.rep * 0.45 + f.ads * 15) * pf);
  const sold = Math.min(f.reams, demand);
  f.reams -= sold;
  f.reamsSold += sold;
  const revenue = Math.round(sold * f.price * 100) / 100;
  f.revenue = Math.round((f.revenue + revenue) * 100) / 100;

  // costs
  const dues = Math.round((f.workers * FACT_WAGE + f.machines * FACT_MAINT) * 100) / 100;
  let paid = dues;
  if (f.cash >= dues) {
    f.cash = Math.round((f.cash - dues) * 100) / 100;
  } else {
    paid = f.cash;
    f.cash = 0;
    f.morale = Math.max(0, f.morale - 10);
    f.rep = Math.max(0, f.rep - 2);
    note("Couldn't make payroll. The workers accepted IOUs and a grudge.", "bad");
  }
  f.costs = Math.round((f.costs + paid) * 100) / 100;

  // reputation & morale drift
  if (sold >= demand && demand > 0) f.rep = Math.min(100, f.rep + 1);
  if (f.price > FACT_FAIR_PRICE * 1.6) f.rep = Math.max(0, f.rep - 1);
  f.morale += (50 - f.morale) * 0.06;
  f.morale = Math.min(100, Math.max(0, f.morale));
  if (strike) note("Morale is in the gutter — the line is running at half speed.", "bad");

  // ads decay
  if (f.ads > 0) f.ads -= 1;

  // events
  if (Math.random() < 0.22) {
    const ev = FACT_EVENTS[Math.floor(Math.random() * FACT_EVENTS.length)];
    ev.apply(f);
    note(ev.text, ev.tone);
  }

  // mercy overdraft
  if (f.cash < 2 && f.reams === 0) {
    f.cash += FACT_EMERGENCY_AID;
    f.emergencies += 1;
    f.rep = Math.max(0, f.rep - 2);
    note(`Moorthy's mercy overdraft: +$${FACT_EMERGENCY_AID}. The moose sighs. (${f.emergencies} time${f.emergencies === 1 ? "" : "s"})`, "info");
  }

  const net = Math.round((revenue - paid) * 100) / 100;
  f.history = [...f.history, net].slice(-50);
  f.day += 1;
  f.revenue = Math.round(f.revenue * 100) / 100;
  return f;
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "TICK": {
      const dayRoll = state.tick > 0 && state.tick % TICKS_PER_DAY === 0;

      // ---- market mood (regime that lifts/drags everything) ----
      let moodDrift = state.moodDrift;
      let moodSteps = state.moodSteps;
      if (moodSteps > 0) {
        moodSteps -= 1;
        if (moodSteps === 0) moodDrift = 0;
      } else if (Math.random() < 0.035) {
        moodSteps = 15 + Math.floor(Math.random() * 25);
        moodDrift = (Math.random() - 0.42) * 0.006; // slight bullish bias, like real markets
      }

      const extraNews: NewsItem[] = [];

      // ---- move every stock ----
      const fairPx = state.factory?.listed ? fairSharePrice(state.factory) : 0;
      const stocks = state.stocks.map((s) => {
        if (s.haltSteps > 0) {
          // trading paused: price frozen, flat line
          return {
            ...s,
            haltSteps: s.haltSteps - 1,
            prev: s.price,
            hist: [...s.hist, s.price].slice(-64),
          };
        }

        // volatility clusters: drifts toward base, occasionally spikes
        const volNow = clamp(
          s.volNow + (s.vol - s.volNow) * 0.03 + (Math.random() - 0.5) * 0.1,
          s.vol * 0.4,
          s.vol * 3
        );
        // slow per-stock trend, mean-reverting random walk
        let trend = clamp(s.trend * 0.99 + (Math.random() - 0.5) * 0.0006, -0.005, 0.005);

        let { shockMag, shockSteps } = s;
        let shock = 0;
        if (shockSteps > 0) {
          shock = shockMag / shockSteps;
          shockSteps -= 1;
        }

        // your listed mill trades toward its fundamentals, not just vibes
        let anchor = 0;
        if (s.sym === "FOLD7" && state.factory?.listed && fairPx > 0) {
          anchor = ((fairPx - s.price) / s.price) * 0.05;
        }
        const ret =
          s.sym === "SMUD"
            ? SMUD_DRIFT + moodDrift * 0.9 + volNow * 0.005 * gaussStd() + shock + anchor
            : s.drift * 0.0007 + trend * 0.25 + moodDrift * s.beta + volNow * 0.006 * gaussStd() + shock + anchor;

        // bankruptcy in progress: the bottom falls out, trading frozen
        let doomNext = s.doom;
        let ret2 = ret;
        if (s.proc && s.doom !== undefined && s.doom > 0) {
          ret2 = -0.2 - Math.random() * 0.08;
          doomNext = s.doom - 1;
        }
        const price = Math.max(0.4, round2(s.price * (1 + ret2)));
        let haltSteps = 0;
        if (s.proc && s.doom !== undefined && s.doom > 0) haltSteps = 1;

        // circuit breaker
        if (Math.abs(ret) > HALT_MOVE) {
          haltSteps = 2;
          trend = 0;
          shockSteps = 0;
          extraNews.push({
            id: Math.floor(Math.random() * 1e9),
            day: dayOf(state.tick),
            time: timeOf(state.tick),
            text: `Circuit breaker! ${s.name} ${ret > 0 ? "skyrocketed" : "tanked"} ${Math.abs(
              ret * 100
            ).toFixed(1)}% in one tick — trading paused to catch its breath.`,
            sym: s.sym,
            tone: ret > 0 ? "good" : "bad",
          });
        }

        const high = Math.max(dayRoll ? price : s.high, price);
        const low = Math.min(dayRoll ? price : s.low, price);

        return {
          ...s,
          prev: s.price,
          price,
          volNow,
          trend,
          shockMag: shockSteps > 0 ? shockMag : 0,
          shockSteps,
          haltSteps,
          dayOpen: dayRoll ? price : s.dayOpen,
          high,
          low,
          sessionVol: dayRoll ? 0 : s.sessionVol,
          hist: [...s.hist, price].slice(-64),
          doom: doomNext,
        };
      });

      // ---- occasional gossip shock (moves one stock for a few ticks) ----
      let news = [...extraNews];
      let stocksFinal = stocks;
      if (extraNews.length === 0 && Math.random() < 0.05 && state.tick > 2) {
        const idx = Math.floor(Math.random() * stocks.length);
        const s = stocks[idx];
        const good = Math.random() < 0.52;
        const mag = (0.05 + Math.random() * 0.09) * (good ? 1 : -1);
        stocksFinal = stocks.map((x, i) =>
          i === idx
            ? { ...x, shockMag: mag, shockSteps: 4, volNow: Math.min(x.vol * 3, x.volNow * 1.6) }
            : x
        );
        const tpl = (good ? NEWS_POS : NEWS_NEG)[
          Math.floor(Math.random() * (good ? NEWS_POS : NEWS_NEG).length)
        ];
        news = [
          {
            id: state.seq,
            day: dayOf(state.tick),
            time: timeOf(state.tick),
            text: tpl.replace("{name}", s.name),
            sym: s.sym,
            tone: good ? "good" : "bad",
          },
        ];
      }

      // ---- the wider exchange: deaths & births (procedural stocks) ----
      let bankruptcyNews: NewsItem[] = [];
      let procRealized = 0;
      if (dayRoll) {
        stocksFinal = stocksFinal.map((st) => {
          if (!st.proc || st.doom !== undefined) return st;
          const cheap = st.entry ? st.price < st.entry * 0.45 : false;
          const p = (st.vol > 2 ? 0.055 : st.vol > 1.3 ? 0.02 : 0.008) * (cheap ? 2.5 : 1);
          if (Math.random() < p) {
            return { ...st, doom: 3 };
          }
          return st;
        });
        for (const st of stocksFinal) {
          if (st.proc && st.doom === 3) {
            bankruptcyNews.push({
              id: Math.floor(Math.random() * 1e9),
              day: dayOf(state.tick),
              time: timeOf(state.tick),
              text: `Auditors circling ${st.name} (${st.sym}) — the shredders run day and night. Trading halted ahead of a likely bankruptcy.`,
              sym: st.sym,
              tone: "bad",
            });
          }
        }
      }

      const dying = stocksFinal.filter((st) => st.proc && st.doom !== undefined && st.doom <= 0);
      if (dying.length > 0) {
        const dyingSyms = new Set(dying.map((d) => d.sym));
        for (const d of dying) {
          const h = state.holdings[d.sym];
          if (h) {
            procRealized = round2(procRealized + (0 - h.avg) * h.qty);
            delete state.holdings[d.sym];
          }
          const sh = state.shorts[d.sym];
          if (sh) {
            procRealized = round2(procRealized + (sh.avg - d.price) * sh.qty);
            delete state.shorts[d.sym];
          }
          delete BASE[d.sym];
          bankruptcyNews.push({
            id: Math.floor(Math.random() * 1e9),
            day: dayOf(state.tick),
            time: timeOf(state.tick),
            text: `${d.name} (${d.sym}) FILED FOR BANKRUPTCY. Shares are voided — paper can only be worth so little forever. The shredder gets the rest.`,
            sym: d.sym,
            tone: "bad",
          });
        }
        stocksFinal = stocksFinal.filter((st) => !dyingSyms.has(st.sym));
      }

      if (dayRoll && stocksFinal.filter((st) => st.proc).length < PROC_MAX && Math.random() < 0.55) {
        const fresh = makeProcStock(stocksFinal.map((st) => st.sym));
        stocksFinal = [...stocksFinal, fresh];
        bankruptcyNews.push({
          id: Math.floor(Math.random() * 1e9),
          day: dayOf(state.tick),
          time: timeOf(state.tick),
          text: `New listing: ${fresh.name} (${fresh.sym}) opens at $${fresh.price.toFixed(2)}. fundamentals unknown. courage required.`,
          sym: fresh.sym,
          tone: "good" as const,
        });
      }

      news = [...bankruptcyNews, ...news, ...state.news].slice(0, 16);

      const idxNow = round2(
        (stocksFinal.reduce((a, s) => a + s.price / (BASE[s.sym] ?? s.price), 0) / stocksFinal.length) * 100
      );

      // loan interest accrues at every closing bell
      let debt = state.debt;
      let interestPaid = state.interestPaid;
      if (dayRoll && state.debt > 0) {
        const int = round2(state.debt * DAILY_LOAN_RATE);
        debt = round2(debt + int);
        interestPaid = round2(interestPaid + int);
      }

      // ---- shorts upkeep: borrow fee at the bell, margin calls when wrong ----
      let cashT = state.cash;
      const shortsT: Record<string, ShortPos> = { ...state.shorts };
      let realizedT = state.realized;
      let feesT = state.feesPaid;
      realizedT = round2(realizedT + procRealized);
      let shortFeesT = state.shortFeesPaid;
      let tradesT = state.trades;
      let forced = 0;

      const holdVal = () =>
        round2(
          Object.entries(state.holdings).reduce((a, [sym, h]) => {
            const st = stocksFinal.find((x) => x.sym === sym);
            return a + (st ? h.qty * st.price : 0);
          }, 0)
        );

      if (dayRoll && Object.keys(shortsT).length > 0) {
        const liab = Object.entries(shortsT).reduce((a, [sym, sh]) => {
          const st = stocksFinal.find((x) => x.sym === sym);
          return a + (st ? sh.qty * st.price : 0);
        }, 0);
        const fee = round2(Math.min(liab * SHORT_BORROW_RATE, Math.max(0, cashT)));
        if (fee > 0) {
          cashT = round2(cashT - fee);
          shortFeesT = round2(shortFeesT + fee);
        }
      }

      for (const sym of Object.keys(shortsT)) {
        const sh = shortsT[sym];
        if (!sh) continue;
        const st = stocksFinal.find((x) => x.sym === sym);
        if (!st) continue;
        let guard = 0;
        while (guard++ < 6) {
          const cur = shortsT[sym];
          if (!cur) break;
          const liab = round2(cur.qty * st.price);
          const assets = round2(cashT + holdVal());
          if (liab <= MARGIN_CALL_AT * assets || liab <= 0) break;

          const px = askOf(st);
          const qtyOwed = cur.qty;
          const fullCost = round2(qtyOwed * px + FEE);

          if (cashT >= fullCost) {
            // the bank covers your whole position
            cashT = round2(cashT - fullCost);
            realizedT = round2(realizedT + (sh.avg - px) * qtyOwed);
            feesT = round2(feesT + FEE);
            tradesT = [
              {
                id: 0,
                day: dayOf(state.tick),
                time: timeOf(state.tick),
                side: "COVER" as TradeSide,
                sym,
                qty: qtyOwed,
                price: px,
                total: fullCost,
              },
              ...tradesT,
            ].slice(0, 50);
            delete shortsT[sym];
            forced++;
            news = [
              {
                id: Math.floor(Math.random() * 1e9),
                day: dayOf(state.tick),
                time: timeOf(state.tick),
                text: `MARGIN CALL at Moorthy's — your ${sym} short got bought back at ${px.toFixed(
                  2
                )}. Betting against paper is a sharp game: losses have no floor.`,
                sym,
                tone: "bad" as const,
              },
              ...news,
            ].slice(0, 14);
            break;
          }

          // not enough cash: the bank dusts your biggest long holding first
          let worstSym = "";
          let worstVal = -1;
          for (const [hsym, h] of Object.entries(state.holdings)) {
            if (!state.holdings[hsym]) continue;
            const hst = stocksFinal.find((x) => x.sym === hsym);
            if (!hst) continue;
            const val = h.qty * hst.price;
            if (val > worstVal) {
              worstVal = val;
              worstSym = hsym;
            }
          }
          if (worstSym) {
            const h = state.holdings[worstSym];
            const hst = stocksFinal.find((x) => x.sym === worstSym)!;
            const bid = bidOf(hst);
            const total = round2(h.qty * bid - FEE);
            cashT = round2(cashT + total);
            realizedT = round2(realizedT + (bid - h.avg) * h.qty);
            feesT = round2(feesT + FEE);
            tradesT = [
              {
                id: 0,
                day: dayOf(state.tick),
                time: timeOf(state.tick),
                side: "SELL" as TradeSide,
                sym: worstSym,
                qty: h.qty,
                price: bid,
                total,
              },
              ...tradesT,
            ].slice(0, 50);
            delete state.holdings[worstSym];
            forced++;
            news = [
              {
                id: Math.floor(Math.random() * 1e9),
                day: dayOf(state.tick),
                time: timeOf(state.tick),
                text: `To protect your ${sym} short, Moorthy's liquidated your ${worstSym} holding at the bid. The bank always gets paid first.`,
                sym,
                tone: "bad" as const,
              },
              ...news,
            ].slice(0, 14);
            continue;
          }

          // last resort: cover whatever the remaining cash affords
          const n = Math.floor(Math.max(0, cashT - FEE) / px);
          if (n < 1) break;
          const cost = round2(n * px + FEE);
          cashT = round2(cashT - cost);
          realizedT = round2(realizedT + (sh.avg - px) * n);
          feesT = round2(feesT + FEE);
          tradesT = [
            {
              id: 0,
              day: dayOf(state.tick),
              time: timeOf(state.tick),
              side: "COVER" as TradeSide,
              sym,
              qty: n,
              price: px,
              total: cost,
            },
            ...tradesT,
          ].slice(0, 50);
          if (n >= qtyOwed) delete shortsT[sym];
          else shortsT[sym] = { qty: qtyOwed - n, avg: sh.avg };
          forced++;
          break;
        }
      }

      // ---- the factory closes one business day at every bell ----
      let factory = state.factory;
      if (dayRoll && factory) factory = simFactory(factory, dayOf(state.tick));

      // ---- Moorthy's reward checks: a little paper dividend some mornings ----
      let pendingCheck = state.pendingCheck;
      if (dayRoll && !pendingCheck && Math.random() < 0.35) {
        pendingCheck = {
          amount: REWARD_MIN + Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1)),
          day: dayOf(state.tick),
        };
      }

      const next: GameState = {
        ...state,
        tick: state.tick + 1,
        stocks: stocksFinal,
        news,
        seq: state.seq + news.length + forced + 1,
        moodDrift,
        moodSteps,
        debt,
        interestPaid,
        cash: cashT,
        shorts: shortsT,
        realized: realizedT,
        feesPaid: feesT,
        shortFeesPaid: shortFeesT,
        trades: tradesT,
        pendingCheck,
        factory,
      };
      next.netWorthHist = [...state.netWorthHist, netWorth(next)].slice(-140);
      next.indexHist = [...state.indexHist, idxNow].slice(-140);
      return next;
    }

    case "BUY": {
      const s = state.stocks.find((x) => x.sym === action.sym);
      if (!s || action.qty < 1 || s.haltSteps > 0) return state;
      if (state.shorts[action.sym]) return state; // settle the short first
      const px = askOf(s); // you pay the ask
      const total = round2(action.qty * px + FEE);
      if (total > state.cash + 1e-9) return state;
      const h = state.holdings[action.sym];
      const qty = (h?.qty ?? 0) + action.qty;
      const avg = round2(((h ? h.avg * h.qty : 0) + action.qty * px) / qty);
      const trade: Trade = {
        id: state.seq,
        day: dayOf(state.tick),
        time: timeOf(state.tick),
        side: "BUY",
        sym: s.sym,
        qty: action.qty,
        price: px,
        total,
      };
      return {
        ...state,
        cash: round2(state.cash - total),
        stocks: applyImpact(state.stocks, s.sym, action.qty, 1),
        holdings: { ...state.holdings, [s.sym]: { qty, avg } },
        trades: [trade, ...state.trades].slice(0, 50),
        feesPaid: round2((state.feesPaid ?? 0) + FEE),
        spentTotal: round2((state.spentTotal ?? 0) + total),
        seq: state.seq + 1,
      };
    }

    case "SELL": {
      const s = state.stocks.find((x) => x.sym === action.sym);
      const h = state.holdings[action.sym];
      if (!s || !h || action.qty < 1 || action.qty > h.qty || s.haltSteps > 0) return state;
      if (state.shorts[action.sym]) return state; // settle the short first
      const px = bidOf(s); // you receive the bid
      const pnl = round2((px - h.avg) * action.qty);
      const total = round2(action.qty * px - FEE);
      const qty = h.qty - action.qty;
      const holdings = { ...state.holdings };
      if (qty <= 0) delete holdings[action.sym];
      else holdings[action.sym] = { qty, avg: h.avg };
      const trade: Trade = {
        id: state.seq,
        day: dayOf(state.tick),
        time: timeOf(state.tick),
        side: "SELL",
        sym: s.sym,
        qty: action.qty,
        price: px,
        total,
      };
      return {
        ...state,
        cash: round2(state.cash + total),
        stocks: applyImpact(state.stocks, s.sym, action.qty, -1),
        holdings,
        realized: round2(state.realized + pnl),
        trades: [trade, ...state.trades].slice(0, 50),
        feesPaid: round2((state.feesPaid ?? 0) + FEE),
        receivedTotal: round2((state.receivedTotal ?? 0) + total),
        seq: state.seq + 1,
      };
    }

    case "BORROW": {
      const amt = round2(action.amt);
      if (!(amt > 0)) return state;
      let assetsV = state.cash;
      for (const [sym, h] of Object.entries(state.holdings)) {
        const st = state.stocks.find((x) => x.sym === sym);
        if (st) assetsV += h.qty * st.price;
      }
      const cap = round2(assetsV * 0.5);
      const take = Math.min(amt, Math.max(0, round2(cap - state.debt)));
      if (take < 0.01) return state;
      return {
        ...state,
        cash: round2(state.cash + take),
        debt: round2(state.debt + take),
        borrowedTotal: round2((state.borrowedTotal ?? 0) + take),
        seq: state.seq + 1,
      };
    }

    case "REPAY": {
      const amt = Math.min(round2(action.amt), state.debt, state.cash);
      if (!(amt > 0)) return state;
      return {
        ...state,
        cash: round2(state.cash - amt),
        debt: round2(state.debt - amt),
        repaidTotal: round2((state.repaidTotal ?? 0) + amt),
        seq: state.seq + 1,
      };
    }

    case "SHORT": {
      const s = state.stocks.find((x) => x.sym === action.sym);
      if (!s || action.qty < 1 || s.haltSteps > 0) return state;
      if (state.holdings[action.sym]) return state; // pick a side first
      const px = bidOf(s); // you sell at the bid
      if (action.qty > maxShortQty(state.cash, holdingsValue(state), px)) return state;
      const total = round2(action.qty * px - FEE);
      if (total <= 0) return state;
      const h = state.shorts[action.sym];
      const qty = (h?.qty ?? 0) + action.qty;
      const avg = round2(((h ? h.avg * h.qty : 0) + action.qty * px) / qty);
      const trade: Trade = {
        id: state.seq,
        day: dayOf(state.tick),
        time: timeOf(state.tick),
        side: "SHORT",
        sym: s.sym,
        qty: action.qty,
        price: px,
        total,
      };
      return {
        ...state,
        cash: round2(state.cash + total),
        stocks: applyImpact(state.stocks, s.sym, action.qty, -1),
        shorts: { ...state.shorts, [s.sym]: { qty, avg } },
        trades: [trade, ...state.trades].slice(0, 50),
        feesPaid: round2((state.feesPaid ?? 0) + FEE),
        shortProceedsTotal: round2((state.shortProceedsTotal ?? 0) + total),
        seq: state.seq + 1,
      };
    }

    case "COVER": {
      const s = state.stocks.find((x) => x.sym === action.sym);
      const sh = state.shorts[action.sym];
      if (!s || !sh || action.qty < 1 || action.qty > sh.qty || s.haltSteps > 0) return state;
      const px = askOf(s); // you buy back at the ask
      const cost = round2(action.qty * px + FEE);
      if (cost > state.cash + 1e-9) return state;
      const pnl = round2((sh.avg - px) * action.qty);
      const qty = sh.qty - action.qty;
      const shorts = { ...state.shorts };
      if (qty <= 0) delete shorts[action.sym];
      else shorts[action.sym] = { qty, avg: sh.avg };
      const trade: Trade = {
        id: state.seq,
        day: dayOf(state.tick),
        time: timeOf(state.tick),
        side: "COVER",
        sym: s.sym,
        qty: action.qty,
        price: px,
        total: cost,
      };
      return {
        ...state,
        cash: round2(state.cash - cost),
        stocks: applyImpact(state.stocks, s.sym, action.qty, 1),
        shorts,
        realized: round2(state.realized + pnl),
        trades: [trade, ...state.trades].slice(0, 50),
        feesPaid: round2((state.feesPaid ?? 0) + FEE),
        coverCostTotal: round2((state.coverCostTotal ?? 0) + cost),
        seq: state.seq + 1,
      };
    }

    case "CLAIM_CHECK": {
      if (!state.pendingCheck) return state;
      const amt = round2(state.pendingCheck.amount);
      return {
        ...state,
        cash: round2(state.cash + amt),
        bonusesTotal: round2((state.bonusesTotal ?? 0) + amt),
        pendingCheck: null,
        seq: state.seq + 1,
      };
    }

    case "FACT_PRICE": {
      const price = Math.min(9.99, Math.max(0.5, round2(action.price)));
      if (!(price > 0)) return state;
      return { ...state, factory: { ...state.factory, price } };
    }

    case "FACT_MACHINE": {
      const f = state.factory;
      const cost = machineCost(f.machines);
      if (f.cash < cost) return state;
      return { ...state, factory: { ...f, cash: round2(f.cash - cost), costs: round2(f.costs + cost), machines: f.machines + 1 } };
    }

    case "FACT_HIRE": {
      const f = state.factory;
      if (f.cash < FACT_HIRE_FEE) return state;
      if (f.workers >= f.machines * 4 + 2) return state;
      return { ...state, factory: { ...f, cash: round2(f.cash - FACT_HIRE_FEE), costs: round2(f.costs + FACT_HIRE_FEE), workers: f.workers + 1 } };
    }

    case "FACT_FIRE": {
      const f = state.factory;
      if (f.workers < 1) return state;
      const sev = Math.min(f.cash, FACT_FIRE_FEE);
      return {
        ...state,
        factory: {
          ...f,
          cash: round2(f.cash - sev),
          costs: round2(f.costs + sev),
          workers: f.workers - 1,
          morale: Math.max(0, f.morale - 8),
        },
      };
    }

    case "FACT_BONUS": {
      const f = state.factory;
      const cost = f.workers * FACT_BONUS_PER_WORKER;
      if (f.workers < 1 || f.cash < cost) return state;
      return {
        ...state,
        factory: { ...f, cash: round2(f.cash - cost), costs: round2(f.costs + cost), morale: Math.min(100, f.morale + 12) },
      };
    }

    case "FACT_ADVERT": {
      const f = state.factory;
      if (f.cash < FACT_ADVERT_COST) return state;
      return {
        ...state,
        factory: { ...f, cash: round2(f.cash - FACT_ADVERT_COST), costs: round2(f.costs + FACT_ADVERT_COST), ads: f.ads + 3 },
      };
    }

    case "FACT_PAY_ME": {
      const f = state.factory;
      const amt = Math.min(round2(action.amt), f.cash);
      if (!(amt > 0)) return state;
      return {
        ...state,
        cash: round2(state.cash + amt),
        factory: { ...f, cash: round2(f.cash - amt) },
        seq: state.seq + 1,
      };
    }

    case "FACT_INJECT": {
      const amt = Math.min(round2(action.amt), state.cash);
      if (!(amt > 0)) return state;
      return {
        ...state,
        cash: round2(state.cash - amt),
        factory: { ...state.factory, cash: round2(state.factory.cash + amt) },
        seq: state.seq + 1,
      };
    }

    case "FACT_IPO": {
      const f = state.factory;
      if (!ipoReady(f)) return state;
      const px = fairSharePrice(f);
      const proceeds = round2(PUBLIC_SHARES * px * (1 - UNDERWRITER_CUT));
      const histSeed = Array.from({ length: 24 }, (_, i) =>
        round2(px * (1 + 0.01 * Math.sin(i / 3)))
      );
      const stock: Stock = {
        sym: "FOLD7",
        name: "Foldville Mills № 7",
        blurb: "Your mill. Publicly traded.",
        price: px,
        prev: px,
        dayOpen: px,
        high: px,
        low: px,
        vol: 1.1,
        volNow: 1.1,
        spreadPct: 0.15,
        beta: 1.0,
        drift: 0.02,
        trend: 0,
        haltSteps: 0,
        sessionVol: 0,
        shockMag: 0,
        shockSteps: 0,
        hist: histSeed,
      };
      const news: NewsItem = {
        id: state.seq,
        day: dayOf(state.tick),
        time: timeOf(state.tick),
        text: `FOLD7 lists at $${px.toFixed(2)} — Foldville Mills № 7 goes public. Moorthy's keeps ${Math.round(UNDERWRITER_CUT * 100)}% for the confetti.`,
        sym: "FOLD7",
        tone: "good",
      };
      // the house mill lists the same morning, at the same price. race on.
      BASE.SMUD = px;
      const smud: Stock = {
        ...stock,
        sym: "SMUD",
        name: "Smudgegate Pulp Co.",
        blurb: "The house mill. Insufferably consistent.",
        vol: 0.9,
        volNow: 0.9,
        beta: 0.9,
        spreadPct: 0.18,
        hist: Array.from({ length: 24 }, (_, i) => round2(px * (1 - 0.008 * Math.sin(i / 3)))),
        price: round2(px * (1 - 0.008 * Math.sin(23 / 3))),
        prev: round2(px * (1 - 0.008 * Math.sin(22 / 3))),
        dayOpen: px,
        high: px,
        low: px,
      };
      const rivalNews: NewsItem = {
        id: state.seq + 2,
        day: dayOf(state.tick),
        time: timeOf(state.tick),
        text: `Rival IPO: Smudgegate Pulp Co. (SMUD) listed the same morning at ${px.toFixed(2)}. Their slogan: "consistently adequate." Moorthy's thinks they'll beat you. Prove the moose wrong.`,
        sym: "SMUD",
        tone: "bad",
      };
      return {
        ...state,
        stocks: [...state.stocks, stock, smud],
        holdings: { ...state.holdings, FOLD7: { qty: FOUNDER_SHARES, avg: px } },
        factory: {
          ...f,
          listed: true,
          founder: FOUNDER_SHARES,
          publicShares: PUBLIC_SHARES,
          ipoPrice: px,
          cash: round2(f.cash + proceeds),
          news: [
            { id: state.seq + 1, day: f.day, text: `IPO day! ${PUBLIC_SHARES} public shares sold at $${px.toFixed(2)} — the till grows by ${fmtMoneySign(proceeds)}.`, tone: "good" as const },
            ...f.news,
          ].slice(0, 6),
        },
        news: [news, rivalNews, ...state.news].slice(0, 14),
        seq: state.seq + 3,
      };
    }

    case "SPEED":
      return { ...state, speed: action.speed };

    case "RESET":
      return initialGame();

    case "TUT_OFF":
      return { ...state, tut: false };

    case "TUT_ON":
      return { ...state, tut: true };

    case "HYDRATE": {
      const s = action.state;
      if (
        !s ||
        s.v !== GAME_VERSION ||
        !Array.isArray(s.stocks) ||
        s.stocks.length < DEFS.length ||
        !Array.isArray(s.indexHist) ||
        !Array.isArray(s.netWorthHist) ||
        typeof s.debt !== "number" ||
        typeof s.feesPaid !== "number" ||
        typeof s.shorts !== "object" ||
        s.shorts === null ||
        typeof s.factory !== "object" ||
        s.factory === null
      )
        return state;
      return s;
    }

    default:
      return state;
  }
}
