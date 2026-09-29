// prereg-2026-09-25 B6: cross-sectional plus time-series filter. Take the K = max(3, round(0.3M))
// coins with the highest 21-session return; keep only those with a positive 21-session return
// and a close above their 20-session average; each kept coin gets 1/K, unused slots stay in cash.
// Stated in advance: its primary track is RISK_IMPROVER (it holds cash by design).
export const meta = {
  id: "r25-crypto-dualmom",
  name: "Crypto dual momentum (top 30% by 3 weeks, above SMA20 and positive), weekly",
  family: "momentum",
  source: "Liu, Tsyvinski & Wu 2022 JF; Liu & Tsyvinski 2021 RFS (risks and returns of cryptocurrency)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "weekly",
  params: { need: 23, lag: 2, minNames: 8, lookback: 21, sma: 20, share: 0.3, minHold: 3 },
};

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}
function order(rows, desc) {
  return rows.sort((a, b) => (desc ? b[1] - a[1] : a[1] - b[1]) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

export function rank(universe, t, ctx) {
  const { need, lag, minNames, lookback, sma, share, minHold } = ctx.params;
  const rows = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    const r = b[e].close / b[e - lookback].close - 1;
    let s = 0;
    for (let k = e - sma + 1; k <= e; k++) s += b[k].close;
    if (Number.isFinite(r) && Number.isFinite(s)) rows.push([sym, r, b[e].close > s / sma]);
  }
  if (rows.length < minNames) return ew(universe);
  const K = Math.max(minHold, Math.round(share * rows.length));
  const out = {};
  for (const [sym, r, above] of order(rows, true).slice(0, K)) if (r > 0 && above) out[sym] = 1 / K;
  return out;
}
