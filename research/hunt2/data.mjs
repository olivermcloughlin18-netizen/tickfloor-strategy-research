// EDGE strategy hunt v2 — discovery-only data loaders.
// Every series leaving this file is (a) a discovery-bucket asset per
// src/lib/quant/holdout.ts and (b) cut so its last bar CLOSES at or before
// DISCOVERY_END. A holdout asset or date throws. There is no opt-out flag.
// Warm all universes once (sequentially, throttled): node --import tsx research/hunt2/data.mjs --warm
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { isDiscoveryAsset, holdoutBoundary, HOLDOUT_MONTHS } from "../../src/lib/quant/holdout.ts";
import { quarantineFor } from "./quarantine.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const CACHE = path.join(import.meta.dirname, "cache");
const HUNT1 = path.join(ROOT, "research/strategy-hunt-2026-09-14/cache");
const DAY = 86400;

// Hard-coded: 18 months before 2026-09-15. Deliberately NOT derived from
// Date.now(), so the boundary cannot creep forward into data that was holdout
// when this hunt started.
export const DISCOVERY_END = Date.UTC(2025, 2, 15) / 1000; // 2025-03-15T00:00:00Z
{
  const d = new Date(Date.UTC(2026, 8, 15));
  d.setUTCMonth(d.getUTCMonth() - HOLDOUT_MONTHS);
  if (d.getTime() / 1000 !== DISCOVERY_END) throw new Error(`DISCOVERY_END mismatch with HOLDOUT_MONTHS=${HOLDOUT_MONTHS}: ${d.toISOString()}`);
  if (DISCOVERY_END > holdoutBoundary()) throw new Error("DISCOVERY_END is after the live holdout boundary");
}
export const TF_SEC = Object.freeze({ "1d": DAY, "1h": 3600 });

// Discovery-bucket members only (asserted below). Crypto: pairs with >=4y of
// discovery history, pegged EUR/PAXG and halted TON excluded. Stocks: liquid
// large caps chosen TODAY — survivorship bias, report it with any finding.
export const UNIVERSES = Object.freeze({
  CRYPTO_DAILY: Object.freeze(["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT", "BCHUSDT", "ATOMUSDT", "ETCUSDT", "DASHUSDT", "ZECUSDT", "AVAXUSDT", "UNIUSDT", "NEARUSDT", "AAVEUSDT", "HBARUSDT"]),
  CRYPTO_1H: Object.freeze(["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"]),
  US_STOCKS_DAILY: Object.freeze(["AAPL", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "V", "UNH", "XOM", "JNJ", "COST", "ABBV", "MRK", "AVGO", "CVX", "WMT", "BAC", "ORCL", "ADBE", "CRM", "NFLX", "AMD", "INTC", "ABT", "MCD", "DIS", "QCOM", "TXN", "HON", "CAT", "LOW", "SBUX", "BA", "UPS", "PFE", "T", "MDT", "UNP", "MMM"]),
  // WIDE sweep universe (2026-09-18): 171 discovery-bucket US equities across 11 sectors and
  // mega->small cap, built by research/hunt2/wide/build.mjs. Same survivorship bias as US_STOCKS_DAILY.
  US_STOCKS_WIDE: Object.freeze(["AAPL", "NVDA", "AVGO", "ORCL", "CRM", "AMD", "INTC", "ADBE", "QCOM", "TXN", "AMAT", "PANW", "SNPS", "CDNS", "ANET", "KLAC", "TER", "MPWR", "ZBRA", "NTAP", "CIEN", "VSAT", "EXTR", "SMCI", "GOOGL", "META", "NFLX", "DIS", "T", "TMUS", "TTWO", "OMC", "NYT", "WBD", "YELP", "CARG", "AMZN", "TSLA", "MCD", "LOW", "SBUX", "BKNG", "CMG", "ORLY", "AZO", "YUM", "DHI", "LEN", "WHR", "LKQ", "BBY", "DKS", "CROX", "SHOO", "WMT", "COST", "MDLZ", "GIS", "HSY", "STZ", "CHD", "CAG", "SJM", "HRL", "JJSF", "CALM", "XOM", "CVX", "COP", "SLB", "PSX", "MPC", "WMB", "OKE", "HAL", "DVN", "FANG", "MUR", "JPM", "BAC", "WFC", "C", "BLK", "SCHW", "AXP", "SPGI", "CB", "PGR", "AIG", "MET", "ALL", "STT", "RF", "ZION", "WAL", "UMBF", "UNH", "JNJ", "ABBV", "MRK", "PFE", "ABT", "DHR", "CVS", "CI", "ISRG", "MDT", "ZBH", "BAX", "HALO", "CAT", "HON", "UNP", "BA", "UPS", "RTX", "MMM", "EMR", "ETN", "ITW", "CSX", "CMI", "ROK", "AOS", "SNA", "GGG", "NDSN", "MSM", "ALSN", "EME", "MLI", "APD", "SHW", "DOW", "NUE", "MLM", "STLD", "ALB", "CE", "RPM", "AVNT", "WOR", "DUK", "D", "AEP", "SRE", "XEL", "ED", "PEG", "WEC", "AEE", "CMS", "CNP", "PNW", "IDA", "NWE", "OGE", "PLD", "AMT", "EQIX", "CCI", "PSA", "O", "WELL", "MAA", "UDR", "REG", "BXP", "HIW", "EPR", "NNN"]),
  // equity index/sector + rates/credit + FX/commodity ETFs
  ETFS_DAILY: Object.freeze(["QQQ", "DIA", "XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLC", "VNQ", "TLT", "IEF", "SHY", "LQD", "HYG", "AGG", "GLD", "SLV", "USO", "UNG", "DBC", "UUP"]),
});
for (const [name, syms] of Object.entries(UNIVERSES)) {
  for (const s of syms) if (!isDiscoveryAsset(s)) throw new Error(`universe ${name} contains holdout asset ${s}`);
}
const ETF_SET = new Set(UNIVERSES.ETFS_DAILY);

export function assetClassOf(symbol) {
  return /USDT$/.test(symbol) ? "crypto" : ETF_SET.has(symbol) ? "etf" : "us_stock";
}

export function assertDiscovery(symbol, end) {
  if (typeof symbol !== "string" || !/^[A-Z0-9.]{1,20}$/.test(symbol)) throw new Error(`bad symbol ${String(symbol)}`);
  if (!isDiscoveryAsset(symbol)) throw new Error(`HOLDOUT asset ${symbol}: holdout-bucket assets are not available in discovery`);
  if (end !== undefined && !(Number.isFinite(end) && end <= DISCOVERY_END)) {
    throw new Error(`HOLDOUT date: end=${end} is after DISCOVERY_END ${new Date(DISCOVERY_END * 1000).toISOString()}`);
  }
}

// ---------- helpers ----------
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
function atomicWrite(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, file);
}
const num = (v) => Number(String(v).replace(/[$,]/g, ""));
const mdy = (s) => { const [m, d, y] = s.split("/").map(Number); return Date.UTC(y, m - 1, d) / 1000; };
function bar(time, o, h, l, c, v) {
  const close = num(c);
  const fix = (x) => (Number.isFinite(num(x)) && num(x) > 0 ? num(x) : close);
  return { time: Number(time), open: fix(o), high: fix(h), low: fix(l), close, volume: Number.isFinite(num(v)) ? num(v) : 0 };
}
const fromRows = (rows) => rows.map((r) => (Array.isArray(r) ? bar(r[0], r[1], r[2], r[3], r[4], r[5]) : bar(r.time, r.open, r.high, r.low, r.close, r.volume)));

/** Dedupe by time, sort, keep only bars that CLOSE at or before `end`. */
function cut(bars, sec, end = DISCOVERY_END) {
  const byT = new Map();
  for (const b of bars) byT.set(b.time, b);
  return [...byT.values()].filter((b) => b.time + sec <= end).sort((a, b) => a.time - b.time);
}
const covers = (bars) => bars.length > 0 && bars.at(-1).time >= DISCOVERY_END - 21 * DAY;

let lastFetch = 0; // ponytail: per-process throttle; run --warm once so parallel agents never fetch
async function get(url, binary = false) {
  const wait = lastFetch + 500 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetch = Date.now();
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0 Safari/537.36", Accept: "application/json, */*", Origin: "https://www.nasdaq.com", Referer: "https://www.nasdaq.com/" } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return binary ? Buffer.from(await r.arrayBuffer()) : r.json();
}

// ---------- sources ----------
async function binanceVision(symbol, tf) {
  const base = "https://data.binance.vision/data/spot";
  const pad = (x) => String(x).padStart(2, "0");
  const urls = [];
  for (let y = 2017; y <= 2025; y++) for (let m = 1; m <= 12; m++) if (y < 2025 || m <= 2) urls.push(`${base}/monthly/klines/${symbol}/${tf}/${symbol}-${tf}-${y}-${pad(m)}.zip`);
  for (let d = 1; d <= 14; d++) urls.push(`${base}/daily/klines/${symbol}/${tf}/${symbol}-${tf}-2025-03-${pad(d)}.zip`);
  const out = [];
  const tmp = path.join(os.tmpdir(), `hunt2-bv-${process.pid}.zip`);
  for (const u of urls) {
    const buf = await get(u, true);
    if (!buf) continue;
    fs.writeFileSync(tmp, buf);
    const csv = execFileSync("unzip", ["-p", tmp], { encoding: "utf8", maxBuffer: 1 << 28 });
    for (const line of csv.split("\n")) {
      const f = line.split(",");
      const t = Number(f[0]);
      if (!Number.isFinite(t) || f.length < 6) continue;
      out.push(bar(Math.floor(t > 1e14 ? t / 1e6 : t / 1e3), f[1], f[2], f[3], f[4], f[5])); // 2025+ files are in microseconds
    }
  }
  fs.rmSync(tmp, { force: true });
  return out;
}

async function coinbase(symbol, sec) {
  const product = symbol.replace(/USDT$/, "-USD");
  const out = [];
  for (let t = Date.UTC(2016, 0, 1) / 1000; t < DISCOVERY_END; t += 300 * sec) {
    const end = Math.min(t + 300 * sec, DISCOVERY_END);
    const rows = await get(`https://api.exchange.coinbase.com/products/${product}/candles?granularity=${sec}&start=${new Date(t * 1000).toISOString()}&end=${new Date(end * 1000).toISOString()}`);
    if (Array.isArray(rows)) for (const r of rows) out.push(bar(r[0], r[3], r[2], r[1], r[4], r[5])); // [time, low, high, open, close, volume]
  }
  return out;
}

async function cryptoBars(symbol, tf) {
  const sec = TF_SEC[tf];
  for (const f of [path.join(ROOT, "engine/.cache", `${symbol}_${tf}.json`), path.join(HUNT1, `${symbol}_${tf}.json`)]) {
    const j = readJson(f);
    const rows = Array.isArray(j) ? j : j?.rows;
    if (rows?.length) {
      const bars = cut(fromRows(rows), sec);
      if (covers(bars)) return { bars, source: path.relative(ROOT, f) };
    }
  }
  let bars = cut(await binanceVision(symbol, tf), sec);
  if (covers(bars)) return { bars, source: "data.binance.vision" };
  bars = cut(await coinbase(symbol, sec), sec);
  if (covers(bars)) return { bars, source: "api.exchange.coinbase.com" };
  throw new Error(`no discovery data for ${symbol} ${tf}`);
}

async function equityBars(symbol) {
  // hunt-1 r1/_ohlcv caches are truncated subsets of the same Nasdaq source; only
  // the full-history chart envelopes are reused.
  const env = readJson(path.join(HUNT1, `${symbol}.json`));
  if (Array.isArray(env?.data?.chart)) {
    const bars = cut(env.data.chart.map((p) => bar(mdy(p.z.dateTime), p.z.open, p.z.high, p.z.low, p.z.close, p.z.volume)), DAY);
    if (covers(bars)) return { bars, source: path.relative(ROOT, path.join(HUNT1, `${symbol}.json`)) };
  }
  const cls = ETF_SET.has(symbol) ? "etf" : "stocks";
  const j = await get(`https://api.nasdaq.com/api/quote/${encodeURIComponent(symbol)}/historical?assetclass=${cls}&fromdate=2012-01-01&todate=2025-03-14&limit=9999`);
  const rows = j?.data?.tradesTable?.rows;
  if (!Array.isArray(rows) || !rows.length) throw new Error(`nasdaq: no rows for ${symbol}`);
  const bars = cut(rows.map((r) => bar(mdy(r.date), r.open, r.high, r.low, r.close, r.volume)), DAY);
  if (!covers(bars)) throw new Error(`nasdaq: ${symbol} does not reach the discovery end`);
  return { bars, source: "api.nasdaq.com" };
}

// 0.001 absolute tolerance: caches are rounded to the cent, not to the tick.
const OHLC_TOL = 0.001;
function validate(symbol, bars, cls) {
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    if (!Number.isInteger(b.time) || !(b.close > 0)) throw new Error(`${symbol}: bad bar at ${i}`);
    for (const f of ["open", "high", "low"]) {
      if (!(Number.isFinite(b[f]) && b[f] > 0)) throw new Error(`${symbol}: invalid ${f} at ${i} (${new Date(b.time * 1000).toISOString().slice(0, 10)})`);
    }
    if (!Number.isFinite(b.volume) || b.volume < 0) throw new Error(`${symbol}: invalid volume at ${i} (${new Date(b.time * 1000).toISOString().slice(0, 10)})`);
    // A bar whose open or close sits outside [low, high] is vendor-corrupt. It is NEVER
    // clamped: quarantine it in research/hunt2/cache/quarantine.json (see
    // scripts/research/quarantine-cache.mjs) so it is excluded and COUNTED, not invented away.
    if (b.low > Math.min(b.open, b.close) + OHLC_TOL || b.high + OHLC_TOL < Math.max(b.open, b.close) || b.high + OHLC_TOL < b.low) {
      throw new Error(`${symbol}: OHLC inconsistent at ${i} (${new Date(b.time * 1000).toISOString().slice(0, 10)}) o=${b.open} h=${b.high} l=${b.low} c=${b.close} — quarantine it with scripts/research/quarantine-cache.mjs --apply, do not clamp it`);
    }
    if (i && b.time <= bars[i - 1].time) throw new Error(`${symbol}: non-increasing time at ${i}`);
    if (i && cls !== "crypto" && Math.abs(b.close / bars[i - 1].close - 1) > 0.5) {
      throw new Error(`${symbol}: ${((b.close / bars[i - 1].close - 1) * 100).toFixed(0)}% day on ${new Date(b.time * 1000).toISOString().slice(0, 10)} — suspected unadjusted split`);
    }
  }
  return Object.freeze(bars.map((b) => Object.freeze(b)));
}

const memo = new Map();
/** symbol -> [{date, reasons}] actually dropped from a loaded series this process. Read by the harness so a run SAYS what it excluded. */
export const EXCLUDED = new Map();
/** Drop vendor-corrupt symbol-days. Recorded, never repaired — see quarantine.json. */
function dropQuarantined(symbol, bars) {
  const q = quarantineFor(symbol);
  if (!q.size) return bars;
  const kept = bars.filter((b) => !q.has(b.time));
  const gone = bars.length - kept.length;
  if (gone) EXCLUDED.set(symbol, bars.filter((b) => q.has(b.time)).map((b) => ({ date: new Date(b.time * 1000).toISOString().slice(0, 10), reasons: q.get(b.time).reasons })));
  return kept;
}

/** Discovery bars for one symbol: frozen [{time (open, epoch s), open, high, low, close, volume}]. */
export async function loadBars(symbol, timeframe = "1d", { end } = {}) {
  assertDiscovery(symbol, end);
  const sec = TF_SEC[timeframe];
  if (!sec) throw new Error(`timeframe must be 1d or 1h, got ${timeframe}`);
  const cls = assetClassOf(symbol);
  if (timeframe === "1h" && cls !== "crypto") throw new Error("1h data is crypto-only");
  const key = `${symbol}_${timeframe}`;
  if (!memo.has(key)) {
    const file = path.join(CACHE, `${key}.json`);
    let cached = readJson(file);
    if (!cached?.bars?.length) {
      cached = cls === "crypto" ? await cryptoBars(symbol, timeframe) : await equityBars(symbol);
      atomicWrite(file, { symbol, timeframe, discoveryEnd: DISCOVERY_END, source: cached.source, bars: cached.bars });
    }
    // re-cut on every read: a hand-edited cache still cannot leak holdout bars
    memo.set(key, validate(symbol, dropQuarantined(symbol, cut(cached.bars, sec)), cls));
  }
  const bars = memo.get(key);
  return end === undefined ? bars : Object.freeze(bars.filter((b) => b.time + sec <= end));
}

// ---------- extras: funding, open interest, macro (all keyed by the time the value became KNOWN) ----------
const EXTRAS = path.join(CACHE, "extras");
const known = (rows) => Object.freeze(rows.filter((r) => Number.isFinite(r.time) && Number.isFinite(r.value) && r.time <= DISCOVERY_END)
  .sort((a, b) => a.time - b.time).map(Object.freeze));

/** Parallel fetch for data.binance.vision (a CDN, so no 500ms throttle); returns unzipped CSV text or null on 404. */
async function visionCsvs(urls, workers = 8) {
  const out = new Array(urls.length).fill(null);
  let next = 0;
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const tmp = path.join(os.tmpdir(), `hunt2-vis-${process.pid}-${w}.zip`);
    while (next < urls.length) {
      const k = next++;
      for (let attempt = 0; ; attempt++) {
        try {
          const r = await fetch(urls[k]);
          if (r.status === 404) break;
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
          out[k] = execFileSync("unzip", ["-p", tmp], { encoding: "utf8", maxBuffer: 1 << 28 });
          break;
        } catch (e) {
          if (attempt >= 3) throw new Error(`${urls[k]}: ${e.message}`);
          await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
        }
      }
    }
    fs.rmSync(tmp, { force: true });
  }));
  return out;
}
const pad2 = (x) => String(x).padStart(2, "0");
const months = (y0, m0) => { const o = []; for (let y = y0; y <= 2025; y++) for (let m = y === y0 ? m0 : 1; m <= 12; m++) if (y < 2025 || m <= 2) o.push(`${y}-${pad2(m)}`); return o; };

/** USDT-M perpetual funding settlements [{time, rate, value}] (value === rate), known at settlement, or null if not cached. */
export function loadFunding(symbol) {
  assertDiscovery(symbol);
  // union of data.binance.vision (2020+) and the legacy hunt-1 cache (BTC/BNB 2021+, identical where they overlap)
  const rows = [...(readJson(path.join(EXTRAS, `funding_${symbol}.json`))?.rows ?? []), ...(readJson(path.join(ROOT, "research/funding-carry-cache", `${symbol}_funding.json`)) ?? [])];
  if (!rows.length) return null;
  return known([...new Map(rows.map((r) => [r[0], r])).values()].map((r) => ({ time: r[0], rate: r[1], value: r[1] })));
}
async function warmFunding(symbol) {
  const csvs = await visionCsvs(months(2019, 9).map((m) => `https://data.binance.vision/data/futures/um/monthly/fundingRate/${symbol}/${symbol}-fundingRate-${m}.zip`));
  const rows = [];
  for (const csv of csvs) for (const line of (csv ?? "").split("\n")) { const f = line.split(","); const t = Number(f[0]); if (Number.isFinite(t) && f.length >= 3) rows.push([Math.floor(t / 1000), Number(f[2])]); }
  if (!rows.length) return 0;
  atomicWrite(path.join(EXTRAS, `funding_${symbol}.json`), { symbol, source: "data.binance.vision futures/um fundingRate", rows: rows.filter((r) => r[0] <= DISCOVERY_END) });
  return rows.length;
}

/** USDT-M open interest, hourly snapshots [{time, value (USD notional), contracts}], known at snapshot, or null if not cached. */
export function loadOpenInterest(symbol) {
  assertDiscovery(symbol);
  const v = readJson(path.join(EXTRAS, `oi_${symbol}.json`));
  return v?.rows ? known([...new Map(v.rows.map((r) => [r[0], r])).values()].map((r) => ({ time: r[0], value: r[2], contracts: r[1] }))) : null; // daily files repeat boundary snapshots
}
async function warmOpenInterest(symbol) {
  const urls = [];
  for (let t = Date.UTC(2020, 8, 1) / 1000; t + DAY <= DISCOVERY_END; t += DAY) {
    const d = new Date(t * 1000).toISOString().slice(0, 10);
    urls.push(`https://data.binance.vision/data/futures/um/daily/metrics/${symbol}/${symbol}-metrics-${d}.zip`);
  }
  const rows = [];
  for (const csv of await visionCsvs(urls)) {
    for (const line of (csv ?? "").split("\n")) {
      const f = line.split(",");
      if (f.length < 4 || !/^\d{4}-\d\d-\d\d \d\d:00:/.test(f[0])) continue; // keep the on-the-hour snapshot
      rows.push([Date.parse(`${f[0].replace(" ", "T")}Z`) / 1000, Number(f[2]), Number(f[3])]);
    }
  }
  if (!rows.length) return 0;
  atomicWrite(path.join(EXTRAS, `oi_${symbol}.json`), { symbol, source: "data.binance.vision futures/um metrics (5-min, on-the-hour kept)", rows: rows.filter((r) => r[0] <= DISCOVERY_END) });
  return rows.length;
}

/**
 * Macro/sentiment series for ctx.macro(id). An observation dated D becomes known at
 * the END of day D + lagDays (time = D + (lagDays + 1) days), so a bar may use it only
 * if the bar closes at or after that. lagDays: 1 for daily FRED/CBOE prints (published
 * the next day), 7 for series FRED receives in weekly releases, 0 for Fear&Greed (as
 * ctx.fearGreed always did). Values are FRED's current vintage (revisions not modelled).
 */
export const MACRO = Object.freeze({
  T10Y2Y: { src: "fred", lagDays: 1, what: "10y minus 2y Treasury yield, pct pts" },
  BAMLH0A0HYM2: { src: "fred", lagDays: 1, what: "ICE BofA US high-yield option-adjusted spread, pct pts" },
  DFII10: { src: "fred", lagDays: 1, what: "10y TIPS real yield, %" },
  T10YIE: { src: "fred", lagDays: 1, what: "10y breakeven inflation, %" },
  DCOILWTICO: { src: "fred", lagDays: 7, what: "WTI crude spot, $/bbl (EIA weekly release)" },
  DTWEXBGS: { src: "fred", lagDays: 7, what: "Nominal broad US dollar index (Fed H.10 weekly release)" },
  VIXCLS: { src: "fred", lagDays: 1, what: "VIX close (FRED copy)" },
  VIX: { src: "cboe", lagDays: 1, what: "CBOE VIX close" },
  VIX3M: { src: "cboe", lagDays: 1, what: "CBOE 3-month VIX close" },
  FNG: { src: "fng", lagDays: 0, what: "alternative.me crypto Fear & Greed, 0-100" },
});
export function loadMacro(id) {
  const spec = MACRO[id];
  if (!spec) throw new Error(`unknown macro id ${String(id)} (have: ${Object.keys(MACRO).join(", ")})`);
  if (spec.src === "fng") {
    const j = readJson(path.join(HUNT1, "fng_full.json"));
    return Array.isArray(j?.data) ? known(j.data.map((r) => ({ time: Number(r.timestamp) + DAY, value: Number(r.value) }))) : null;
  }
  const v = readJson(path.join(EXTRAS, `macro_${id}.json`));
  return v?.rows ? known(v.rows.map(([d, x]) => ({ time: d + (spec.lagDays + 1) * DAY, value: x }))) : null;
}
async function warmMacro(id) {
  const spec = MACRO[id];
  let rows = [];
  if (spec.src === "fred") {
    const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`);
    if (!r.ok) throw new Error(`FRED ${id} HTTP ${r.status}`);
    for (const line of (await r.text()).split("\n").slice(1)) { const [d, x] = line.split(","); const t = Date.parse(`${d}T00:00:00Z`) / 1000; if (Number.isFinite(t) && x !== "." && x?.trim()) rows.push([t, Number(x)]); }
  } else if (spec.src === "cboe") {
    const r = await fetch(`https://cdn.cboe.com/api/global/us_indices/daily_prices/${id}_History.csv`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) throw new Error(`CBOE ${id} HTTP ${r.status}`);
    for (const line of (await r.text()).split("\n").slice(1)) { const f = line.split(","); if (f.length >= 5 && f[0].includes("/")) rows.push([mdy(f[0]), Number(f[4])]); }
  } else return 0;
  // keep only observations that are KNOWN by the discovery end
  rows = rows.filter(([d, x]) => Number.isFinite(x) && d + (spec.lagDays + 1) * DAY <= DISCOVERY_END);
  if (!rows.length) throw new Error(`${id}: no discovery rows`);
  atomicWrite(path.join(EXTRAS, `macro_${id}.json`), { id, ...spec, rows });
  return rows.length;
}

/** Daily crypto Fear & Greed [{time, value}], time = when the day's value is known. Alias of loadMacro("FNG"). */
export const loadFearGreed = () => loadMacro("FNG");

if (process.argv[1] === import.meta.filename && process.argv[2] === "--warm-extras") {
  const span = (rows) => (rows?.length ? `n=${rows.length} ${new Date(rows[0].time * 1000).toISOString().slice(0, 10)}..${new Date(rows.at(-1).time * 1000).toISOString().slice(0, 10)}` : "MISSING");
  for (const id of Object.keys(MACRO)) {
    try { if (!loadMacro(id)) await warmMacro(id); console.log(`macro ${id} ${span(loadMacro(id))}`); } catch (e) { console.log(`macro ${id} FAIL ${e.message}`); }
  }
  for (const s of UNIVERSES.CRYPTO_DAILY) {
    try { if (!readJson(path.join(EXTRAS, `funding_${s}.json`))) await warmFunding(s); console.log(`funding ${s} ${span(loadFunding(s))}`); } catch (e) { console.log(`funding ${s} FAIL ${e.message}`); }
  }
  for (const s of UNIVERSES.CRYPTO_1H) {
    try { if (!loadOpenInterest(s)) await warmOpenInterest(s); console.log(`oi ${s} ${span(loadOpenInterest(s))}`); } catch (e) { console.log(`oi ${s} FAIL ${e.message}`); }
  }
}

if (process.argv[1] === import.meta.filename && process.argv[2] === "--warm") {
  for (const [name, syms] of Object.entries(UNIVERSES)) {
    const tf = name === "CRYPTO_1H" ? "1h" : "1d";
    for (const s of syms) {
      try {
        const b = await loadBars(s, tf);
        console.log(`${name} ${s} ${tf} n=${b.length} ${new Date(b[0].time * 1000).toISOString().slice(0, 10)}..${new Date(b.at(-1).time * 1000).toISOString().slice(0, 10)}`);
      } catch (e) {
        console.log(`${name} ${s} ${tf} FAIL ${e.message}`);
      }
    }
  }
  console.log(`funding BTCUSDT n=${loadFunding("BTCUSDT")?.length} BNBUSDT n=${loadFunding("BNBUSDT")?.length}; fear&greed n=${loadFearGreed()?.length}`);
}
