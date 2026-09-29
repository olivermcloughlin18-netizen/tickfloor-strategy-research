// prereg-2026-09-25 B6: weekly 3-week cross-sectional momentum; hold the K = max(3, round(0.3M))
// coins with the highest 21-session return, equal weight, fully invested.
export const meta = {
  id: "r25-crypto-mom3w",
  name: "Crypto 3-week cross-sectional momentum, weekly",
  family: "momentum",
  source: "Liu, Tsyvinski & Wu 2022 JF (common risk factors in cryptocurrency)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "weekly",
  params: { need: 23, lag: 2, minNames: 8, lookback: 21, share: 0.3, minHold: 3 },
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
  const { need, lag, minNames, lookback, share, minHold } = ctx.params;
  const rows = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    const r = b[e].close / b[e - lookback].close - 1;
    if (Number.isFinite(r)) rows.push([sym, r]);
  }
  if (rows.length < minNames) return ew(universe);
  const K = Math.max(minHold, Math.round(share * rows.length));
  const out = {};
  for (const [sym] of order(rows, true).slice(0, K)) out[sym] = 1 / K;
  return out;
}
