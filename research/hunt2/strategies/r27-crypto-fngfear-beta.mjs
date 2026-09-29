// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "r27-crypto-fngfear-beta",
  name: "Crypto high-beta tilt for 90 days after extreme fear",
  family: "sentiment",
  source: "u/Corey_Blake, r/CryptoMarkets 1wp3tyi (extreme fear <= 10 followed by 90-day gains 8 of 8 times); Baker & Wurgler 2006 JF (high sentiment-beta assets rebound most); Da, Engelberg & Gao 2015 RFS (FEARS reversals)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "daily",
  params: { lag: 2, fearLevel: 10, fearDays: 90, betaWindow: 90, need: 92, minNames: 8, frac: 0.3 },
};

// bars[k] = { time, open, high, low, close, volume }. r(k) = close[k]/close[k-1] - 1.
// For a symbol with L bars, e = L - lag is the last bar the signal may use (the session
// before the rebalance session; the harness fills at the rebalance close).
function ownReturns(b, e, w) {
  const r = new Array(w);
  for (let i = 0; i < w; i++) {
    const k = e - w + 1 + i;
    const v = b[k].close / b[k - 1].close - 1;
    if (!Number.isFinite(v)) return null;
    r[i] = v;
  }
  return r;
}

// beta = sample cov(r, m) / sample var(m), aligned by array position (not by date).
function betaOf(r, m) {
  const n = r.length;
  let rMean = 0, mMean = 0;
  for (let i = 0; i < n; i++) { rMean += r[i]; mMean += m[i]; }
  rMean /= n; mMean /= n;
  let cov = 0, varM = 0;
  for (let i = 0; i < n; i++) {
    cov += (r[i] - rMean) * (m[i] - mMean);
    varM += (m[i] - mMean) * (m[i] - mMean);
  }
  cov /= (n - 1); varM /= (n - 1);
  return cov / varM; // NaN/Infinity if varM is 0 or degenerate
}

function ewPresent(universe) {
  const names = Object.keys(universe);
  const w = {};
  for (const s of names) w[s] = 1 / names.length;
  return w;
}

// PORTFOLIO (cross-sectional): universe[SYMBOL] = bars up to and including date t.
// ctx.state starts as {}: initialise fields with `=== undefined`. ctx.macro(id) is known
// by the close of the rebalance day. No lookahead: only bars up to b[e] are ever read.
export function rank(universe, t, ctx) {
  const p = ctx.params;

  const f = ctx.macro("FNG");
  if (f !== null && f <= p.fearLevel) ctx.state.lastFear = t;

  const fear = ctx.state.lastFear !== undefined && t - ctx.state.lastFear <= (p.fearDays - 1) * 86400;
  if (!fear) return ewPresent(universe);

  const btc = universe.BTCUSDT;
  if (!btc || btc.length < p.need) return ewPresent(universe);

  const eBtc = btc.length - p.lag;
  const m = ownReturns(btc, eBtc, p.betaWindow);
  if (m === null) return ewPresent(universe);

  const E = [{ sym: "BTCUSDT", beta: 1 }];
  for (const sym of Object.keys(universe)) {
    if (sym === "BTCUSDT") continue;
    const b = universe[sym];
    if (b.length < p.need) continue;
    const e = b.length - p.lag;
    const r = ownReturns(b, e, p.betaWindow);
    if (r === null) continue;
    const beta = betaOf(r, m);
    if (!Number.isFinite(beta)) continue;
    E.push({ sym, beta });
  }

  if (E.length < p.minNames) return ewPresent(universe);

  E.sort((a, b) => b.beta - a.beta || (a.sym < b.sym ? -1 : a.sym > b.sym ? 1 : 0));
  const K = Math.max(3, Math.round(p.frac * E.length));
  const top = E.slice(0, K);

  const weights = {};
  for (const s of top) weights[s.sym] = 1 / top.length;
  return weights;
}
