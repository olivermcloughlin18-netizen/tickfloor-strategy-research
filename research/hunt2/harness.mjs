// EDGE strategy hunt v2 — the harness. Every number in results/ and
// ledger.jsonl is computed here from discovery data. A strategy module only
// returns positions (signal mode) or weights (portfolio mode).
//
// METRIC DEFINITIONS (v2, see CHANGELOG.md). All on the same daily grid, same days:
//   R[k], B[k]   daily simple net return of the strategy / of the benchmark. Both are
//                equal-weight across the assets that traded that UTC day, rebalanced
//                daily (so "buy&hold" = daily-rebalanced equal-weight long of the same assets).
//   CAGR         (prod(1+R))^(1/years) - 1, years = calendar span / 365.25 (geometric).
//   excess/yr    CAGR(strategy) - CAGR(buy&hold), percentage points per year. Cash => -B&H CAGR,
//                identical-to-B&H => 0. Halves: the same formula inside each half.
//   p (excess)   one-sided circular block bootstrap of daily log(1+R) - log(1+B). Its mean is
//                > 0 exactly when CAGR(strategy) > CAGR(buy&hold), so p and excess/yr agree in sign.
//   Sharpe       mean(R)/sd(R) * sqrt(return days per year). p (Sharpe): paired circular block
//                bootstrap of Sharpe(R) - Sharpe(B), centred, one-sided.
//   random %     share of exposure-matched random controls whose mean daily log return
//                (and, separately, Sharpe) is strictly below the strategy's.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { DISCOVERY_END, TF_SEC, UNIVERSES, loadBars, loadFunding, loadOpenInterest, loadMacro, MACRO, assetClassOf, assertDiscovery, EXCLUDED } from "./data.mjs";
import { blockBootstrapPValueRefined, mulberry32 } from "../../src/lib/quant/stats.ts";
import { slippageFor, DEFAULT_SLIPPAGE } from "../../src/lib/quant/walkforward.ts";

const HERE = import.meta.dirname;
const ROOT = path.resolve(HERE, "../..");
export const RESULTS_DIR = path.join(HERE, "results");
export const SOURCES_DIR = path.join(RESULTS_DIR, "sources");
export const LEDGER_PATH = path.join(HERE, "ledger.jsonl");
export const METRICS_VERSION = 2;
export const MIN_TRADES = 5;
/** INDEX_PROXY rule: a catalogue rule naming a holdout index ETF may run on a declared discovery proxy. */
export const INDEX_PROXY = Object.freeze({ holdout: Object.freeze(["SPY", "IWM", "EFA"]), proxies: Object.freeze(["QQQ", "DIA"]) });
const SEEDS = 200;
const DAY = 86400;
const MIN_DAYS = 250;

// ---------- misuse guards ----------
const FORBIDDEN = [
  [/\bimport\b/, "import (strategies must be self-contained)"],
  [/\brequire\b/, "require"],
  [/\bprocess\b/, "process"],
  [/\bglobalThis\b|\bglobal\b/, "global object"],
  [/\beval\b|\bFunction\b/, "eval/Function"],
  [/\bfetch\b|\bXMLHttpRequest\b|\bWebSocket\b/, "network"],
  [/\bReflect\b|\bProxy\b|\bconstructor\b|\bprototype\b|__proto__|getPrototypeOf|defineProperty/, "reflection"],
  [/\bDate\.now\b|\bperformance\b|\bMath\.random\b/, "clock/randomness"],
  [/\bsetTimeout\b|\bsetInterval\b|\bqueueMicrotask\b|\bWebAssembly\b|\bSharedArrayBuffer\b|\bAtomics\b/, "runtime escape"],
];
function scanSource(source, file) {
  source.split("\n").forEach((line, n) => {
    for (const [re, label] of FORBIDDEN) {
      if (re.test(line)) throw new Error(`forbidden: ${label} at ${path.basename(file)}:${n + 1}: ${line.trim()}`);
    }
  });
}

let loadCounter = 0;
// fresh module instance per run: module-level state cannot carry data between runs
const freshModule = (file) => import(`${pathToFileURL(file).href}?hunt2=${++loadCounter}`);

const META_KEYS = new Set(["id", "name", "family", "source", "assetClass", "timeframe", "holdBars", "params", "longShort", "assets", "universe", "rebalance", "proxyFor"]);
function deepFreeze(o) {
  if (o && typeof o === "object") { Object.values(o).forEach(deepFreeze); Object.freeze(o); }
  return o;
}
export function validateMeta(mod, file, override) {
  const m = mod.meta;
  const bad = (msg) => { throw new Error(`meta: ${msg}`); };
  if (!m || typeof m !== "object") bad("export const meta = {...} is required");
  for (const k of Object.keys(m)) if (!META_KEYS.has(k)) bad(`unknown key "${k}" (allowed: ${[...META_KEYS].join(", ")})`);
  if (typeof m.id !== "string" || !/^[a-z0-9][a-z0-9_-]{2,60}$/.test(m.id)) bad("id must be 3-61 chars of a-z 0-9 _ -");
  if (!file.endsWith(".mjs") || path.basename(file, ".mjs") !== m.id) bad(`id "${m.id}" must equal the filename (got ${path.basename(file)})`);
  for (const k of ["name", "family", "source"]) if (typeof m[k] !== "string" || !m[k].trim()) bad(`${k} must be a non-empty string`);
  if (!["crypto", "us_stock", "etf"].includes(m.assetClass)) bad("assetClass must be crypto | us_stock | etf");
  if (!TF_SEC[m.timeframe]) bad("timeframe must be 1d | 1h");
  if (m.timeframe === "1h" && m.assetClass !== "crypto") bad("1h is crypto-only");
  const isSignal = typeof mod.signal === "function";
  const isRank = typeof mod.rank === "function";
  if (isSignal === isRank) bad("export exactly one of signal(bars, i, ctx) or rank(universe, t, ctx)");
  if (!m.params || typeof m.params !== "object" || Array.isArray(m.params)) bad("params must be an object ({} if none)");
  if (m.longShort !== undefined && typeof m.longShort !== "boolean") bad("longShort must be true or false");
  if (m.holdBars !== undefined && (!isSignal || !Number.isInteger(m.holdBars) || m.holdBars < 1 || m.holdBars > 2000)) bad("holdBars must be an integer 1..2000 (signal strategies only)");
  if (m.rebalance !== undefined && (!isRank || !["daily", "weekly", "monthly"].includes(m.rebalance))) bad("rebalance must be daily | weekly | monthly (rank strategies only)");
  if (isRank && m.timeframe !== "1d") bad("rank (portfolio) strategies are daily only");
  if (m.universe !== undefined && !UNIVERSES[m.universe]) bad(`universe must be one of ${Object.keys(UNIVERSES).join(", ")}`);
  if (m.assets !== undefined && (!Array.isArray(m.assets) || !m.assets.length || m.assets.some((s) => typeof s !== "string") || new Set(m.assets).size !== m.assets.length)) bad("assets must be a non-empty list of distinct symbols");
  if (m.assets && m.universe) bad("give assets or universe, not both");
  if (m.proxyFor !== undefined) {
    if (!m.proxyFor || typeof m.proxyFor !== "object" || Array.isArray(m.proxyFor) || !Object.keys(m.proxyFor).length) bad('proxyFor must be an object like {"SPY": "QQQ"}');
    const assets = override ? Object.keys(override) : resolveAssets(m);
    for (const [h, p] of Object.entries(m.proxyFor)) {
      if (!INDEX_PROXY.holdout.includes(h)) bad(`proxyFor key ${h}: only ${INDEX_PROXY.holdout.join("/")} may be proxied (INDEX_PROXY rule)`);
      if (!INDEX_PROXY.proxies.includes(p)) bad(`proxyFor ${h} -> ${p}: the proxy must be one of ${INDEX_PROXY.proxies.join("/")}`);
      if (!assets.includes(p)) bad(`proxyFor ${h} -> ${p}: ${p} must be one of the strategy's assets`);
    }
  }
  if (!override && m.assets) {
    for (const s of m.assets) {
      assertDiscovery(s);
      if (assetClassOf(s) !== m.assetClass) bad(`${s} is ${assetClassOf(s)} but meta.assetClass is ${m.assetClass}`);
    }
  }
  return deepFreeze(JSON.parse(JSON.stringify({ ...m, mode: isRank ? "portfolio" : "signal" })));
}
function resolveAssets(meta) {
  if (meta.assets) return meta.assets;
  if (meta.universe) return UNIVERSES[meta.universe];
  return meta.assetClass === "crypto" ? (meta.timeframe === "1h" ? UNIVERSES.CRYPTO_1H : UNIVERSES.CRYPTO_DAILY)
    : meta.assetClass === "etf" ? UNIVERSES.ETFS_DAILY : UNIVERSES.US_STOCKS_DAILY;
}
const costFor = (cls, symbol) => (cls === "crypto" ? 0.001 + (slippageFor(symbol) ?? DEFAULT_SLIPPAGE) : 0.0005);

/**
 * Read-only view of bars[0..limit]. Any index read past `limit` throws AND sets
 * a flag, so a strategy that catches the error is still rejected.
 */
function makeView(target) {
  let limit = -1;
  let peeked = false;
  const idx = (p) => (typeof p === "string" && /^(0|[1-9]\d*)$/.test(p) ? Number(p) : -1);
  const deny = () => { throw new Error("bars are read-only"); };
  const view = new Proxy(target, {
    get(t, p, r) {
      if (p === "length") return limit + 1;
      const n = idx(p);
      if (n >= 0) {
        if (n > limit) { peeked = true; throw new Error(`LOOKAHEAD: read bars[${n}] while deciding bar ${limit}`); }
        return t[n];
      }
      return Reflect.get(t, p, r);
    },
    has(t, p) { const n = idx(p); return n >= 0 ? n <= limit : Reflect.has(t, p); },
    ownKeys() { const k = []; for (let i = 0; i <= limit; i++) k.push(String(i)); k.push("length"); return k; },
    getOwnPropertyDescriptor(t, p) {
      if (p === "length") return { value: limit + 1, writable: true, enumerable: false, configurable: false };
      const n = idx(p);
      if (n >= 0) return n <= limit ? { value: t[n], writable: false, enumerable: true, configurable: true } : undefined;
      return Reflect.getOwnPropertyDescriptor(t, p);
    },
    set: deny, defineProperty: deny, deleteProperty: deny, setPrototypeOf: deny,
  });
  return {
    view, setLimit: (n) => { limit = n; }, takePeeked: () => { const p = peeked; peeked = false; return p; },
    markPeek: (msg) => { peeked = true; throw new Error(`LOOKAHEAD: ${msg}`); },
  };
}

function lastAtOrBefore(arr, t) {
  let lo = 0, hi = arr.length - 1, ans = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (arr[mid].time <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
  return ans;
}
const valueAt = (series, t) => { if (!series) return null; const k = lastAtOrBefore(series, t); return k < 0 ? null : series[k].value; };

// ---------- ctx helpers (O(1) amortised per bar) ----------
const posInt = (n, what) => { if (!Number.isInteger(n) || n < 1) throw new Error(`${what}: window must be an integer >= 1 (got ${String(n)})`); };
const FIELDS = ["open", "high", "low", "close", "volume", "ret"];

/** Push-based rolling window for any custom series: const w = ctx.rolling(20); w.push(x); w.mean() / w.std() / w.sum() / w.full(). */
function rollingWindow(n) {
  posInt(n, "rolling");
  const buf = new Float64Array(n);
  let k = 0, cnt = 0, s = 0, s2 = 0;
  return Object.freeze({
    push(x) {
      if (!Number.isFinite(x)) throw new Error(`rolling.push: value must be finite (got ${String(x)})`);
      if (cnt === n) { const o = buf[k]; s -= o; s2 -= o * o; } else cnt++;
      buf[k] = x; k = (k + 1) % n; s += x; s2 += x * x;
      if (k === 0 && cnt === n) { s = 0; s2 = 0; for (const v of buf) { s += v; s2 += v * v; } } // re-sum every n pushes: no float drift
      return this;
    },
    full: () => cnt === n, count: () => cnt,
    sum: () => (cnt === n ? s : NaN),
    mean: () => (cnt === n ? s / n : NaN),
    std: () => { if (cnt < n) return NaN; if (n < 2) return 0; const m = s / n; return Math.sqrt(Math.max(0, (s2 - n * m * m) / (n - 1))); },
  });
}

/**
 * Memoised causal indicators over one symbol's bars. Each series is extended lazily
 * up to the index asked for, never past the bar being decided. A missing or
 * non-finite input (e.g. "ret" on bar 0) resets the window, so NaN never poisons a running sum.
 */
function makeIndicators(bars, cur, markPeek) {
  const cache = new Map();
  const at = (i, what) => {
    const c = cur();
    if (i === undefined) return c;
    if (!Number.isInteger(i) || i < 0) throw new Error(`${what}: index must be an integer >= 0 (got ${String(i)})`);
    if (i > c) markPeek(`${what} read at bar ${i} while deciding bar ${c}`);
    return i;
  };
  const src = (f, j) => (f === "ret" ? (j ? bars[j].close / bars[j - 1].close - 1 : NaN) : bars[j][f]);
  const field = (f, what) => { if (!FIELDS.includes(f)) throw new Error(`${what}: field must be one of ${FIELDS.join(", ")} (got ${String(f)})`); };
  function series(key, i, init, step) {
    const j = at(i, key.split("|")[0]);
    let s = cache.get(key);
    if (!s) cache.set(key, (s = { out: new Float64Array(bars.length), done: -1, st: init() }));
    while (s.done < j) { s.done++; s.out[s.done] = step(s.st, s.done); }
    return s.out[j];
  }
  const roll = (kind) => (f, n, i) => {
    field(f, kind); posInt(n, kind);
    return series(`${kind}|${f}|${n}`, i, () => ({ w: null }), (st, j) => {
      const x = src(f, j);
      if (!Number.isFinite(x)) { st.w = null; return NaN; }
      (st.w ??= rollingWindow(n)).push(x);
      return st.w[kind === "rollingSum" ? "sum" : kind === "rollingStd" ? "std" : "mean"]();
    });
  };
  const extreme = (f, n, i, isMax) => series(`donchian|${f}|${n}`, i, () => ({ q: [], h: 0 }), (st, j) => {
    const x = bars[j][f], q = st.q;
    while (q.length > st.h && (isMax ? bars[q.at(-1)][f] <= x : bars[q.at(-1)][f] >= x)) q.pop();
    q.push(j);
    while (q[st.h] <= j - n) st.h++;
    if (st.h > 4096) { st.q = q.slice(st.h); st.h = 0; }
    return j + 1 >= n ? bars[st.q[st.h]][f] : NaN;
  });
  const sma = roll("rollingMean");
  return {
    sma, rollingMean: sma, rollingSum: roll("rollingSum"), rollingStd: roll("rollingStd"),
    ema(f, n, i) {
      field(f, "ema"); posInt(n, "ema");
      return series(`ema|${f}|${n}`, i, () => ({ c: 0, s: 0, e: NaN }), (st, j) => {
        const x = src(f, j);
        if (!Number.isFinite(x)) { st.c = 0; st.s = 0; st.e = NaN; return NaN; }
        if (st.c < n) { st.s += x; st.c++; if (st.c === n) st.e = st.s / n; return st.e; } // seeded with the SMA of the first n
        st.e += (2 / (n + 1)) * (x - st.e);
        return st.e;
      });
    },
    rsi(n, i) {
      posInt(n, "rsi");
      return series(`rsi|${n}`, i, () => ({ c: 0, g: 0, l: 0 }), (st, j) => {
        if (j === 0) return NaN;
        const d = bars[j].close - bars[j - 1].close, up = Math.max(d, 0), dn = Math.max(-d, 0);
        if (st.c < n) { st.g += up / n; st.l += dn / n; st.c++; if (st.c < n) return NaN; }
        else { st.g = (st.g * (n - 1) + up) / n; st.l = (st.l * (n - 1) + dn) / n; }
        return st.g + st.l === 0 ? 50 : 100 - 100 / (1 + st.g / st.l);
      });
    },
    atr(n, i) {
      posInt(n, "atr");
      return series(`atr|${n}`, i, () => ({ c: 0, a: 0 }), (st, j) => {
        const b = bars[j], pc = j ? bars[j - 1].close : b.close;
        const tr = Math.max(b.high - b.low, Math.abs(b.high - pc), Math.abs(b.low - pc));
        if (st.c < n) { st.a += tr / n; st.c++; return st.c === n ? st.a : NaN; }
        st.a = (st.a * (n - 1) + tr) / n;
        return st.a;
      });
    },
    /** highest high / lowest low of bars i-n+1..i INCLUDING bar i; use i-1 for "breaks the prior n-bar high". */
    donchian(n, i) {
      posInt(n, "donchian");
      return { upper: extreme("high", n, i, true), lower: extreme("low", n, i, false) };
    },
  };
}

const RESAMPLE = { "1w": (t) => Math.floor((Math.floor(t / DAY) + 3) / 7), "1M": (t) => { const d = new Date(t * 1000); return d.getUTCFullYear() * 12 + d.getUTCMonth(); } };
const periodEnd = (p, t) => {
  if (p === "1w") return (RESAMPLE["1w"](t) * 7 + 4) * DAY; // next Monday 00:00 UTC
  const d = new Date(t * 1000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) / 1000;
};
/** ctx.resample(bars, "1w" | "1M"): OHLCV periods through the latest visible bar; the last one has complete=false until its period has closed. Incremental. */
function makeResampler(sec) {
  const memo = new WeakMap();
  return (bars, period) => {
    if (!RESAMPLE[period]) throw new Error(`resample: period must be "1w" or "1M" (got ${String(period)})`);
    if (!bars || typeof bars !== "object") throw new Error("resample: pass the bars you were given");
    let byP = memo.get(bars);
    if (!byP) memo.set(bars, (byP = {}));
    const st = (byP[period] ??= { done: -1, completed: [], cur: null });
    const n = bars.length;
    for (let j = st.done + 1; j < n; j++) {
      const b = bars[j], key = RESAMPLE[period](b.time);
      if (st.cur && st.cur.key === key) {
        st.cur.high = Math.max(st.cur.high, b.high); st.cur.low = Math.min(st.cur.low, b.low); st.cur.close = b.close; st.cur.volume += b.volume; st.cur.bars++; st.cur.lastTime = b.time;
      } else {
        if (st.cur) st.completed.push(Object.freeze({ ...st.cur, complete: true }));
        st.cur = { key, time: b.time, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume, bars: 1, lastTime: b.time };
      }
      st.done = j;
    }
    if (!st.cur) return Object.freeze([]);
    return Object.freeze([...st.completed, Object.freeze({ ...st.cur, complete: st.cur.lastTime + sec >= periodEnd(period, st.cur.time) })]);
  };
}

/** Lazily loaded extras shared by one evaluate(); records what was served so it enters dataSha256. */
function makeExtras(cryptoSymbols) {
  const used = new Map();
  const memo = new Map();
  const get = (key, load) => { if (!memo.has(key)) memo.set(key, load()); const s = memo.get(key); if (s) used.set(key, s); return s; };
  return {
    macro: (id) => { if (!MACRO[id]) throw new Error(`ctx.macro: unknown id ${String(id)} (have: ${Object.keys(MACRO).join(", ")})`); const s = get(`macro:${id}`, () => loadMacro(id)); if (!s) throw new Error(`ctx.macro: ${id} is not cached; run node --import tsx research/hunt2/data.mjs --warm-extras`); return s; },
    funding: (sym) => (cryptoSymbols.has(sym) ? get(`funding:${sym}`, () => loadFunding(sym)) : null),
    oi: (sym) => (cryptoSymbols.has(sym) ? get(`oi:${sym}`, () => loadOpenInterest(sym)) : null),
    fingerprint: () => [...used].sort().map(([k, s]) => `${k}:${s.length}:${s.at(-1)?.time}:${s.at(-1)?.value}`).join("|"),
  };
}

/** ctx for signal(bars, i, ctx). Exported for the self-test. */
export function makeSignalCtx(meta, symbol, bars, extras, markPeek) {
  const sec = TF_SEC[meta.timeframe];
  let cur = -1;
  const closeAt = (i, what) => {
    if (i === undefined) return bars[cur].time + sec;
    if (!Number.isInteger(i) || i < 0) throw new Error(`${what}: index must be an integer >= 0`);
    if (i > cur) markPeek(`${what} at bar ${i} while deciding bar ${cur}`);
    return bars[i].time + sec;
  };
  const ctx = Object.freeze({
    symbol,
    params: meta.params,
    state: {},
    /** latest value of a MACRO series known by the close of bar i (default: the current bar), or null */
    macro: (id, i) => valueAt(extras.macro(id), closeAt(i, "ctx.macro")),
    /** latest crypto Fear&Greed value known by the close of bar i, or null */
    fearGreed: (i) => valueAt(extras.macro("FNG"), closeAt(i, "ctx.fearGreed")),
    /** latest settled 8h funding rate for this symbol, or null */
    fundingRate: (i) => valueAt(extras.funding(symbol), closeAt(i, "ctx.fundingRate")),
    /** latest hourly open-interest USD notional for this symbol, or null */
    openInterest: (i) => valueAt(extras.oi(symbol), closeAt(i, "ctx.openInterest")),
    resample: makeResampler(sec),
    rolling: rollingWindow,
    ...makeIndicators(bars, () => cur, markPeek),
  });
  return { ctx, setBar: (i) => { cur = i; } };
}

// ---------- signal mode ----------
async function signalsFor(file, meta, symbol, bars, extras, upto) {
  const mod = await freshModule(file);
  const visible = bars.slice(0, upto + 1);
  const { view, setLimit, takePeeked, markPeek } = makeView(visible);
  const { ctx, setBar } = makeSignalCtx(meta, symbol, visible, extras, markPeek);
  const raw = new Int8Array(upto + 1);
  for (let i = 0; i <= upto; i++) {
    setLimit(i);
    setBar(i);
    let s;
    try {
      s = mod.signal(view, i, ctx);
    } catch (e) {
      if (String(e?.message).startsWith("LOOKAHEAD")) throw e;
      throw new Error(`${meta.id}: signal() threw on ${symbol} bar ${i}: ${e?.message ?? e}`);
    }
    if (takePeeked()) throw new Error(`LOOKAHEAD: ${meta.id} read a future bar on ${symbol} bar ${i} (and caught the error)`);
    if (s !== -1 && s !== 0 && s !== 1) throw new Error(`${meta.id}: signal() must return -1, 0 or 1 (got ${String(s)} on ${symbol} bar ${i})`);
    if (s === -1 && !meta.longShort) throw new Error(`${meta.id}: signal() returned -1 but the strategy is long-only (set meta.longShort: true to allow shorts)`);
    raw[i] = s;
  }
  return raw;
}

function toPositions(raw, holdBars) {
  if (!holdBars) return raw;
  const pos = new Int8Array(raw.length);
  let left = 0, dir = 0;
  for (let i = 0; i < raw.length; i++) {
    if (left > 0) { pos[i] = dir; left--; continue; }
    if (raw[i] !== 0) { dir = raw[i]; pos[i] = dir; left = holdBars - 1; }
  }
  return pos;
}

/** r[i] = net return realised over bar i from position pos[i-1]; costs multiplicative on |Δpos|. */
function assetReturns(bars, pos, c) {
  const n = bars.length;
  const r = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const px = bars[i].close / bars[i - 1].close - 1;
    const p = pos[i - 1];
    let g = (1 + p * px) * (1 - c * Math.abs(p - (i >= 2 ? pos[i - 2] : 0)));
    if (i === n - 1) g *= 1 - c * Math.abs(p); // close out at the end
    r[i] = Math.max(g - 1, -1);
  }
  return r;
}
function segments(pos) {
  const segs = [];
  for (let i = 0; i < pos.length - 1; i++) {
    if (pos[i] === 0) continue;
    if (segs.length && segs.at(-1).start + segs.at(-1).len === i && segs.at(-1).dir === pos[i]) segs.at(-1).len++;
    else segs.push({ start: i, len: 1, dir: pos[i] });
  }
  return segs;
}
/** Same trade lengths + directions, placed at random non-overlapping spots after the first real entry. */
function shuffledPositions(segs, n, rnd) {
  const out = new Int8Array(n);
  if (!segs.length) return out;
  const first = segs[0].start;
  const L = segs.reduce((a, s) => a + s.len, 0);
  const F = n - 1 - first - L;
  const order = segs.slice();
  for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
  const cuts = order.map(() => Math.floor(rnd() * (F + 1))).sort((a, b) => a - b);
  let cursor = first, prev = 0;
  for (let k = 0; k < order.length; k++) {
    cursor += cuts[k] - prev;
    prev = cuts[k];
    out.fill(order[k].dir, cursor, cursor + order[k].len);
    cursor += order[k].len;
  }
  return out;
}
/** Equal-weight across assets present that UTC day; intraday bars compounded to the day. */
function daily(assets, rets, D, present) {
  const out = new Float64Array(D);
  for (let a = 0; a < assets.length; a++) {
    const d = assets[a].dIdx, r = rets[a];
    let cur = -1, lg = 0;
    for (let i = 1; i < r.length; i++) {
      if (d[i] !== cur) { if (cur >= 0) out[cur] += Math.expm1(lg); cur = d[i]; lg = 0; }
      lg += Math.log1p(r[i]);
    }
    if (cur >= 0) out[cur] += Math.expm1(lg);
  }
  for (let k = 0; k < D; k++) out[k] /= present[k];
  return out;
}

function tooFewTrades(meta, trades, nAssets, minTrades) {
  if (trades >= minTrades) return;
  throw new Error(`${meta.id}: only ${trades} trade(s) across ${nAssets} asset(s) (minimum ${minTrades}). The signal (almost) never fired, which is an implementation bug, not a result, and nothing was recorded. Check your signal: ctx.state starts as {} (so "if (!ctx.state)" never runs and its fields stay undefined); bar.time is epoch SECONDS, not milliseconds; a warm-up window longer than the history; a threshold that can never be crossed; a comparison against undefined or NaN.`);
}
const sharpeOf = (xs) => { let s = 0, s2 = 0; for (const x of xs) { s += x; s2 += x * x; } const n = xs.length, m = s / n, v = (s2 - n * m * m) / (n - 1); return v > 0 ? m / Math.sqrt(v) : 0; };
const meanLogOf = (xs) => { let s = 0; for (const x of xs) s += lg(x); return xs.length ? s / xs.length : 0; };
function controlSummary(method, actualR, seedRs) {
  const aLog = meanLogOf(actualR), aSh = sharpeOf(actualR);
  const logs = seedRs.map(meanLogOf), shs = seedRs.map(sharpeOf);
  return {
    seeds: seedRs.length, method, statistic: "mean daily log(1+net return) (ranks like CAGR); sharpePercentile ranks daily Sharpe",
    percentile: logs.filter((m) => m < aLog).length / seedRs.length, actual: aLog, seedMedian: median(logs),
    sharpePercentile: shs.filter((m) => m < aSh).length / seedRs.length, actualSharpeDaily: aSh, seedMedianSharpeDaily: median(shs),
  };
}

async function runSignalMode(file, meta, symbols, series, cost, extras, minTrades) {
  const assets = [];
  const lookahead = [];
  for (const s of symbols) {
    const bars = series[s];
    const n = bars.length;
    if (n < 30) throw new Error(`${s}: only ${n} bars`);
    const raw = await signalsFor(file, meta, s, bars, extras, n - 1);
    const pos = toPositions(raw, meta.holdBars);
    assets.push({ symbol: s, bars, raw, pos, cost: cost[s], segs: segments(pos) });
  }
  tooFewTrades(meta, assets.reduce((x, a) => x + a.segs.length, 0), assets.length, minTrades);
  for (const A of assets.slice(0, 3)) {
    const n = A.bars.length;
    for (const frac of [0.4, 0.75]) {
      const cutAt = Math.floor((n - 1) * frac);
      const r2 = await signalsFor(file, meta, A.symbol, A.bars, extras, cutAt);
      for (let j = 0; j <= cutAt; j++) {
        if (r2[j] !== A.raw[j]) throw new Error(`LOOKAHEAD/NONDETERMINISM: ${A.symbol} bar ${j} signal was ${A.raw[j]} with full history but ${r2[j]} with data truncated at bar ${cutAt} — the signal depends on future data, the clock, or randomness`);
      }
      lookahead.push(`${A.symbol}@${cutAt}`);
    }
  }
  const daySet = new Set();
  for (const a of assets) for (let i = 1; i < a.bars.length; i++) daySet.add(Math.floor(a.bars[i].time / DAY));
  const days = [...daySet].sort((x, y) => x - y);
  const D = days.length;
  const dayPos = new Map(days.map((d, k) => [d, k]));
  const present = new Float64Array(D);
  for (const a of assets) {
    a.dIdx = new Int32Array(a.bars.length).fill(-1);
    let last = -1;
    for (let i = 1; i < a.bars.length; i++) { a.dIdx[i] = dayPos.get(Math.floor(a.bars[i].time / DAY)); if (a.dIdx[i] !== last) { present[a.dIdx[i]]++; last = a.dIdx[i]; } }
  }
  const rets = assets.map((a) => assetReturns(a.bars, a.pos, a.cost));
  const bh = assets.map((a) => { const r = new Float64Array(a.bars.length); for (let i = 1; i < r.length; i++) r[i] = a.bars[i].close / a.bars[i - 1].close - 1; return r; });
  const R = daily(assets, rets, D, present);
  const B = daily(assets, bh, D, present);

  const seedRs = [];
  for (let s = 0; s < SEEDS; s++) {
    const rnd = mulberry32(0x5eed + s * 7919);
    seedRs.push(daily(assets, assets.map((a) => assetReturns(a.bars, shuffledPositions(a.segs, a.bars.length, rnd), a.cost)), D, present));
  }

  let trades = 0, expSum = 0, bars = 0, held = 0;
  const perAsset = {};
  for (let a = 0; a < assets.length; a++) {
    const A = assets[a];
    for (const sg of A.segs) {
      let g = 1;
      for (let i = sg.start + 1; i <= sg.start + sg.len; i++) g *= 1 + sg.dir * (A.bars[i].close / A.bars[i - 1].close - 1);
      expSum += Math.max(g * (1 - A.cost) ** 2 - 1, -1);
    }
    const exp = A.pos.slice(0, -1).reduce((x, p) => x + Math.abs(p), 0);
    trades += A.segs.length; held += exp; bars += A.bars.length - 1;
    perAsset[A.symbol] = {
      bars: A.bars.length, trades: A.segs.length, exposure: exp / (A.bars.length - 1),
      totalReturn: rets[a].reduce((x, r, i) => (i ? x * (1 + r) : x), 1) - 1,
      bhReturn: A.bars.at(-1).close / A.bars[0].close - 1,
    };
  }
  return {
    days, R, B, perAsset, lookahead,
    activity: { trades, rebalances: 0, exposure: held / bars, netExpectancy: trades ? expSum / trades : 0 },
    randomControl: controlSummary("same trade lengths/directions at random non-overlapping spots, same costs (exposure-matched)", R, seedRs),
    period: { startTime: Math.min(...assets.map((a) => a.bars[0].time)), endTime: Math.max(...assets.map((a) => a.bars.at(-1).time)) },
  };
}

// ---------- portfolio mode ----------
function isRebalance(day, nextDay, freq) {
  if (freq === "daily") return true;
  if (freq === "weekly") return Math.floor((day + 3) / 7) !== Math.floor((nextDay + 3) / 7); // Monday-start weeks
  return new Date(day * DAY * 1000).getUTCMonth() !== new Date(nextDay * DAY * 1000).getUTCMonth();
}

async function rankAll(file, meta, symbols, series, idx, days, rebal, upto, extras) {
  const mod = await freshModule(file);
  const cutDay = days[rebal[upto]];
  const views = symbols.map((s) => {
    const bars = series[s];
    let m = bars.length;
    while (m > 0 && Math.floor(bars[m - 1].time / DAY) > cutDay) m--;
    return makeView(bars.slice(0, m));
  });
  let closeTime = 0;
  const ctx = Object.freeze({
    params: meta.params, state: {},
    /** latest value of a MACRO series known by the close of the rebalance day, or null */
    macro: (id) => valueAt(extras.macro(id), closeTime),
    resample: makeResampler(DAY),
    rolling: rollingWindow,
  });
  const events = [];
  for (let e = 0; e <= upto; e++) {
    const k = rebal[e];
    closeTime = days[k] * DAY + DAY;
    const uni = {};
    const keys = [];
    for (let a = 0; a < symbols.length; a++) {
      const i = idx[a][k];
      if (i >= 0) { views[a].setLimit(i); uni[symbols[a]] = views[a].view; keys.push(symbols[a]); }
    }
    Object.freeze(uni);
    const date = new Date(days[k] * DAY * 1000).toISOString().slice(0, 10);
    let w;
    try {
      w = mod.rank(uni, days[k] * DAY, ctx);
    } catch (err) {
      if (String(err?.message).startsWith("LOOKAHEAD")) throw err;
      throw new Error(`${meta.id}: rank() threw on ${date}: ${err?.message ?? err}`);
    }
    if (views.some((v) => v.takePeeked())) throw new Error(`LOOKAHEAD: ${meta.id} read a future bar on ${date}`);
    if (!w || typeof w !== "object" || Array.isArray(w)) throw new Error(`${meta.id}: rank() must return an object {SYMBOL: weight} (got ${String(w)} on ${date})`);
    let gross = 0;
    const list = [];
    for (const [sym, x] of Object.entries(w)) {
      if (!Object.hasOwn(uni, sym)) throw new Error(`${meta.id}: weight for ${sym}, which has no bar on ${date}`);
      if (!Number.isFinite(x)) throw new Error(`${meta.id}: weight for ${sym} is not a finite number on ${date}`);
      if (x < 0 && !meta.longShort) throw new Error(`${meta.id}: negative weight for ${sym} but the strategy is long-only (set meta.longShort: true)`);
      if (x !== 0) { list.push([sym, x]); gross += Math.abs(x); }
    }
    if (gross > 1 + 1e-9) throw new Error(`${meta.id}: gross weight ${gross.toFixed(4)} > 1 on ${date}`);
    list.sort((p, q) => (p[0] < q[0] ? -1 : 1));
    events.push({ k, keys, list });
  }
  return events;
}

function portfolioReturns(events, symIndex, ret, D, cost) {
  const R = new Float64Array(D);
  let cur = new Map();
  let e = 0;
  const periods = [];
  let periodG = 1;
  for (let k = 1; k < D; k++) {
    let turnCost = 0;
    while (e < events.length && events[e].k < k) {
      const next = new Map(events[e].list);
      for (const s of new Set([...cur.keys(), ...next.keys()])) turnCost += Math.abs((next.get(s) ?? 0) - (cur.get(s) ?? 0)) * cost[s];
      if (cur.size) periods.push(periodG - 1);
      cur = next; periodG = 1; e++;
    }
    let g = 0;
    for (const [s, w] of cur) { const r = ret[symIndex.get(s)][k]; if (!Number.isNaN(r)) g += w * r; }
    let x = (1 + g) * (1 - turnCost);
    if (k === D - 1) for (const [s, w] of cur) x *= 1 - Math.abs(w) * cost[s];
    R[k] = Math.max(x - 1, -1);
    if (cur.size) periodG *= 1 + R[k];
  }
  if (cur.size) periods.push(periodG - 1);
  return { R, periods };
}

async function runPortfolioMode(file, meta, symbols, series, cost, extras, minTrades) {
  const daySet = new Set();
  for (const s of symbols) for (const b of series[s]) daySet.add(Math.floor(b.time / DAY));
  const days = [...daySet].sort((x, y) => x - y);
  const D = days.length;
  const dayPos = new Map(days.map((d, k) => [d, k]));
  const idx = symbols.map((s) => { const a = new Int32Array(D).fill(-1); series[s].forEach((b, i) => { a[dayPos.get(Math.floor(b.time / DAY))] = i; }); return a; });
  const ret = symbols.map((s, a) => { const r = new Float64Array(D).fill(NaN); const bars = series[s]; for (let k = 0; k < D; k++) { const i = idx[a][k]; if (i >= 1) r[k] = bars[i].close / bars[i - 1].close - 1; } return r; });
  const symIndex = new Map(symbols.map((s, a) => [s, a]));
  const rebal = [];
  for (let k = 0; k < D - 1; k++) if (isRebalance(days[k], days[k + 1], meta.rebalance ?? "monthly")) rebal.push(k);
  if (rebal.length < 3) throw new Error("fewer than 3 rebalance dates");

  const events = await rankAll(file, meta, symbols, series, idx, days, rebal, rebal.length - 1, extras);
  let turnovers = 0, invested = 0, grossSum = 0, cur = [];
  for (let k = 1, e = 0; k < D; k++) {
    while (e < events.length && events[e].k < k) {
      if (JSON.stringify(events[e].list) !== JSON.stringify(cur)) turnovers++;
      if (events[e].list.length) invested++;
      cur = events[e].list; e++;
    }
    grossSum += cur.reduce((x, p) => x + Math.abs(p[1]), 0);
  }
  tooFewTrades(meta, turnovers, symbols.length, minTrades);
  const lookahead = [];
  for (const frac of [0.5, 0.8]) {
    const upto = Math.floor((rebal.length - 1) * frac);
    const ev2 = await rankAll(file, meta, symbols, series, idx, days, rebal, upto, extras);
    for (let e = 0; e <= upto; e++) {
      if (JSON.stringify(ev2[e].list) !== JSON.stringify(events[e].list)) {
        throw new Error(`LOOKAHEAD/NONDETERMINISM: weights on ${new Date(days[rebal[e]] * DAY * 1000).toISOString().slice(0, 10)} changed when data was truncated at event ${upto}`);
      }
    }
    lookahead.push(`event@${upto}`);
  }

  const { R, periods } = portfolioReturns(events, symIndex, ret, D, cost);
  const B = new Float64Array(D);
  for (let k = 1; k < D; k++) { let s = 0, c = 0; for (let a = 0; a < symbols.length; a++) if (!Number.isNaN(ret[a][k])) { s += ret[a][k]; c++; } B[k] = c ? s / c : 0; }

  const seedRs = [];
  for (let s = 0; s < SEEDS; s++) {
    const rnd = mulberry32(0xbeef + s * 7919);
    const evs = events.map((ev) => {
      const n = ev.list.length;
      if (!n) return ev;
      const keys = ev.keys.slice();
      for (let j = 0; j < n; j++) { const r = j + Math.floor(rnd() * (keys.length - j)); [keys[j], keys[r]] = [keys[r], keys[j]]; }
      const vals = ev.list.map((x) => x[1]);
      for (let j = vals.length - 1; j > 0; j--) { const r = Math.floor(rnd() * (j + 1)); [vals[j], vals[r]] = [vals[r], vals[j]]; }
      return { k: ev.k, keys: ev.keys, list: keys.slice(0, n).map((sym, j) => [sym, vals[j]]) };
    });
    seedRs.push(portfolioReturns(evs, symIndex, ret, D, cost).R.subarray(1));
  }

  return {
    days: days.slice(1), R: R.subarray(1), B: B.subarray(1), perAsset: null, lookahead,
    activity: { trades: turnovers, rebalances: invested, exposure: grossSum / (D - 1), netExpectancy: periods.length ? meanOf(periods) : 0 },
    randomControl: controlSummary("same number of names and weight values per rebalance, names drawn at random from that date's universe, same costs (gross-exposure-matched)", R.subarray(1), seedRs),
    period: { startTime: days[0] * DAY, endTime: days.at(-1) * DAY },
  };
}

// ---------- stats ----------
function meanOf(xs) { let s = 0; for (const x of xs) s += x; return xs.length ? s / xs.length : 0; }
function median(xs) { const s = [...xs].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; }
const iso = (day) => new Date(day * DAY * 1000).toISOString().slice(0, 10);
const lg = (r) => Math.log(Math.max(1 + r, 1e-12)); // ponytail: a -100% day floors at log(1e-12) instead of -Infinity
/** Geometric metrics over R[a..b). CAGR and Sharpe both annualise with the calendar span of that slice. */
export function metrics(R, days, a = 0, b = R.length) {
  const n = b - a;
  const years = (days[b - 1] - days[a] + 1) / 365.25;
  let eq = 1, peak = 1, mdd = 0, s = 0, s2 = 0;
  for (let k = a; k < b; k++) { const r = R[k]; eq *= 1 + r; if (eq > peak) peak = eq; mdd = Math.max(mdd, 1 - eq / peak); s += r; s2 += r * r; }
  const m = s / n;
  const sd = Math.sqrt(Math.max(0, (s2 - n * m * m) / (n - 1)));
  return { totalReturn: eq - 1, cagr: eq > 0 ? eq ** (1 / years) - 1 : -1, sharpe: sd ? (m / sd) * Math.sqrt(n / years) : 0, maxDD: mdd, days: n, years };
}
const compound = (R, a, b) => { let g = 1; for (let k = a; k < b; k++) g *= 1 + R[k]; return g - 1; };

/** One-sided paired circular block bootstrap for Sharpe(R) > Sharpe(B), centred on the observed difference. */
export function sharpeDiffPValue(R, B, blockLen, { seed = 43, screenIters = 2000, refineIters = 100000, screenAt = 0.02 } = {}) {
  const n = R.length;
  const L = Math.max(1, Math.min(n, blockLen));
  const observed = sharpeOf(R) - sharpeOf(B);
  if (!(observed > 0)) return { p: 1, observedDaily: observed, iters: 0, blockLen: L };
  const run = (iters) => {
    const rnd = mulberry32(seed);
    let hits = 0;
    for (let it = 0; it < iters; it++) {
      let sr = 0, sr2 = 0, sb = 0, sb2 = 0, c = 0;
      while (c < n) {
        const start = (rnd() * n) | 0;
        for (let k = 0; k < L && c < n; k++, c++) { const j = (start + k) % n; const x = R[j], y = B[j]; sr += x; sr2 += x * x; sb += y; sb2 += y * y; }
      }
      const mr = sr / n, mb = sb / n, vr = (sr2 - n * mr * mr) / (n - 1), vb = (sb2 - n * mb * mb) / (n - 1);
      const d = (vr > 0 ? mr / Math.sqrt(vr) : 0) - (vb > 0 ? mb / Math.sqrt(vb) : 0);
      if (d - observed >= observed) hits++;
    }
    return (hits + 1) / (iters + 1);
  };
  let p = run(screenIters), iters = screenIters;
  if (p <= screenAt) { p = run(refineIters); iters = refineIters; }
  return { p, observedDaily: observed, iters, blockLen: L };
}

function sha256(s) { return crypto.createHash("sha256").update(s).digest("hex"); }

// ---------- entry points ----------
/**
 * Evaluate a strategy file. `data` / `costPerSide` / `minTrades` overrides exist only for the
 * self-test (synthetic nulls) and can never write results or the ledger.
 */
export async function evaluate(file, { data = null, costPerSide = null, minTrades = MIN_TRADES, write = false } = {}) {
  if ((data || costPerSide !== null || minTrades !== MIN_TRADES) && write) throw new Error("evaluate(): data/cost/minTrades overrides cannot write results or the ledger");
  file = path.resolve(file);
  const source = fs.readFileSync(file, "utf8");
  scanSource(source, file);
  const mod = await freshModule(file);
  const meta = validateMeta(mod, file, data);
  const symbols = data ? Object.keys(data) : resolveAssets(meta);
  const series = {};
  for (const s of symbols) series[s] = data ? Object.freeze(data[s].map((b) => Object.freeze({ ...b }))) : await loadBars(s, meta.timeframe);
  const cost = Object.fromEntries(symbols.map((s) => [s, costPerSide ?? costFor(meta.assetClass, s)]));
  const extras = makeExtras(new Set(!data && meta.assetClass === "crypto" ? symbols : []));

  const run = meta.mode === "portfolio" ? await runPortfolioMode(file, meta, symbols, series, cost, extras, minTrades) : await runSignalMode(file, meta, symbols, series, cost, extras, minTrades);
  const { days, R, B } = run;
  const n = R.length;
  if (n < MIN_DAYS) throw new Error(`only ${n} return days — too short to evaluate`);
  const strat = metrics(R, days);
  const bench = metrics(B, days);
  const Dx = Array.from(R, (r, k) => lg(r) - lg(B[k]));
  const boot = blockBootstrapPValueRefined(Dx, { seed: 42 });
  const sharpeTest = sharpeDiffPValue(R, B, boot.blockLen);
  const h = n >> 1;
  const halves = [[0, h], [h, n]].map(([a, b]) => {
    const s = metrics(R, days, a, b), m = metrics(B, days, a, b);
    return { from: iso(days[a]), to: iso(days[b - 1]), excessAnnual: s.cagr - m.cagr, stratCagr: s.cagr, bhCagr: m.cagr, stratSharpe: s.sharpe, bhSharpe: m.sharpe, stratMaxDD: s.maxDD, bhMaxDD: m.maxDD, stratReturn: s.totalReturn, bhReturn: m.totalReturn };
  });
  const folds = [];
  for (let k = 0; k < n;) {
    const y = new Date(days[k] * DAY * 1000).getUTCFullYear();
    let j = k;
    while (j < n && new Date(days[j] * DAY * 1000).getUTCFullYear() === y) j++;
    const s = compound(R, k, j), b = compound(B, k, j);
    folds.push({ year: y, days: j - k, stratReturn: s, bhReturn: b, excessReturn: s - b });
    k = j;
  }
  const substitutions = meta.proxyFor ? Object.entries(meta.proxyFor).map(([holdout, proxy]) => ({ holdout, proxy, rule: "INDEX_PROXY" })) : [];
  // What the data layer threw away, so no sweep can run short of its universe in silence.
  const exSyms = symbols.filter((s) => EXCLUDED.has(s)).map((s) => ({ symbol: s, dates: EXCLUDED.get(s) }));
  const excluded = {
    symbols: exSyms, barDays: exSyms.reduce((n, e) => n + e.dates.length, 0),
    assetsRequested: symbols.length, assetsWithExclusions: exSyms.length,
    rule: "vendor-corrupt bars are quarantined (dropped), never clamped or interpolated; see research/hunt2/cache/quarantine.json",
  };
  const dataSha256 = sha256(symbols.map((s) => `${s}:${series[s].length}:${series[s][0].time}:${series[s].at(-1).time}:${series[s].at(-1).close}`).join("|") + (extras.fingerprint() ? `#${extras.fingerprint()}` : ""));
  const result = {
    id: meta.id, name: meta.name, family: meta.family, source: meta.source, mode: meta.mode,
    assetClass: meta.assetClass, timeframe: meta.timeframe, meta,
    assets: symbols, nAssets: symbols.length, substitutions,
    strategyPath: path.relative(ROOT, file),
    sourceSha256: sha256(source), dataSha256,
    harnessSha256: sha256(fs.readFileSync(path.join(HERE, "harness.mjs"), "utf8") + fs.readFileSync(path.join(HERE, "data.mjs"), "utf8")),
    metricsVersion: METRICS_VERSION,
    ranAt: new Date().toISOString(),
    discoveryEnd: new Date(DISCOVERY_END * 1000).toISOString(),
    period: { start: iso(days[0]), end: iso(days.at(-1)), startTime: run.period.startTime, endTime: run.period.endTime, returnDays: n },
    costs: { perSide: cost, note: "charged on every change in position/weight; benchmark pays none; no funding/borrow on shorts" },
    portfolio: { ...strat, ...run.activity },
    benchmark: { ...bench, what: "equal-weight long of the same assets, rebalanced daily across assets trading that day (no costs)" },
    excess: {
      annual: strat.cagr - bench.cagr, relativeAnnual: (1 + strat.cagr) / (1 + bench.cagr) - 1, meanDailyLog: meanOf(Dx),
      p: boot.p, pFloor: boot.floor, bootstrapIters: boot.iters, blockLen: boot.blockLen, effectiveN: boot.effectiveN,
      definition: "annual = CAGR(strategy) - CAGR(buy&hold) over identical days; cash => -CAGR(buy&hold)",
      test: "one-sided circular block bootstrap of daily log(1+strategy) - log(1+buy&hold) (mean>0 <=> strategy CAGR > buy&hold CAGR)",
    },
    sharpeTest: { diff: strat.sharpe - bench.sharpe, p: sharpeTest.p, iters: sharpeTest.iters, blockLen: sharpeTest.blockLen, test: "one-sided paired circular block bootstrap of Sharpe(strategy) - Sharpe(buy&hold), centred" },
    halves, halfExcess: halves.map((x) => x.excessAnnual), halfSharpeDiff: halves.map((x) => x.stratSharpe - x.bhSharpe), folds,
    randomControl: run.randomControl,
    lookaheadCheck: { method: "bars view throws past bar i; ctx lookups are capped at bar i; positions re-run on truncated data must match", truncations: run.lookahead, ok: true },
    perAsset: run.perAsset,
    dataExclusions: excluded,
    warnings: excluded.symbols.length
      ? [`DATA EXCLUSIONS: ${excluded.barDays} vendor-corrupt symbol-day(s) dropped across ${excluded.symbols.length} of ${symbols.length} assets (${excluded.symbols.map((e) => `${e.symbol} ${e.dates.map((d) => d.date).join(",")}`).join("; ")}). Quarantined, never repaired — research/hunt2/cache/quarantine.json.`]
      : [],
  };
  if (write) {
    const prior = readLedgerLines().filter((e) => e.id === meta.id && e.sourceSha256 !== result.sourceSha256);
    if (prior.length) result.warnings.push(`id ${meta.id} already has ${new Set(prior.map((e) => e.sourceSha256)).size} ledger run(s) with different source — this run counts as an additional test`);
    writeRun(result, source);
    fs.appendFileSync(LEDGER_PATH, JSON.stringify(ledgerEntry(result, result.resultPath)) + "\n");
  }
  return result;
}

/** Persist the result JSON and a content-addressed copy of the exact source, so any ledger row can be recomputed later. */
export function writeRun(result, source) {
  fs.mkdirSync(path.join(SOURCES_DIR, result.sourceSha256), { recursive: true });
  fs.writeFileSync(path.join(SOURCES_DIR, result.sourceSha256, `${result.id}.mjs`), source);
  const out = path.join(RESULTS_DIR, `${result.id}.json`);
  result.resultPath = path.relative(ROOT, out);
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
}

/** The only entry point agents use (via run.mjs): real discovery data, real costs, writes results + ledger. */
export function runStrategy(file, { write = true } = {}) {
  return evaluate(file, { write });
}

export function ledgerEntry(r, resultPath) {
  return {
    id: r.id, name: r.name, family: r.family, source: r.source, mode: r.mode, assetClass: r.assetClass, timeframe: r.timeframe,
    nAssets: r.nAssets, assets: r.nAssets <= 10 ? r.assets : undefined, proxyFor: r.meta.proxyFor, strategyPath: r.strategyPath, resultPath,
    sourceSha256: r.sourceSha256, dataSha256: r.dataSha256, harnessSha256: r.harnessSha256, metricsVersion: r.metricsVersion, ranAt: r.ranAt,
    pExcess: r.excess.p, excessAnnual: r.excess.annual, cagr: r.portfolio.cagr, bhCagr: r.benchmark.cagr,
    sharpe: r.portfolio.sharpe, bhSharpe: r.benchmark.sharpe, pSharpe: r.sharpeTest.p, maxDD: r.portfolio.maxDD, bhMaxDD: r.benchmark.maxDD,
    trades: r.portfolio.trades, rebalances: r.portfolio.rebalances, exposure: r.portfolio.exposure, netExpectancy: r.portfolio.netExpectancy,
    randomPercentile: r.randomControl.percentile, randomSharpePercentile: r.randomControl.sharpePercentile,
    halfExcess: r.halfExcess, halfSharpeDiff: r.halfSharpeDiff,
  };
}

export function readLedgerLines() {
  if (!fs.existsSync(LEDGER_PATH)) return [];
  return fs.readFileSync(LEDGER_PATH, "utf8").split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
}
