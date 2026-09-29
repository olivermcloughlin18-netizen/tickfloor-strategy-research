// prereg-2026-09-25 B6: dollar-volume-share momentum. score = (30-session dollar-volume share of
// the eligible universe) / (180-session share) - 1; hold the K highest, weekly.
export const meta = {
  id: "r25-crypto-volshare",
  name: "Crypto dollar-volume-share momentum (30 vs 180 sessions), weekly",
  family: "momentum",
  source: "Liu, Tsyvinski & Wu 2022 JF (volume factors); Barber & Odean 2008 RFS (attention)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "weekly",
  params: { need: 182, lag: 2, minNames: 8, short: 30, long: 180, share: 0.3, minHold: 3 },
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
  const { need, lag, minNames, short, long, share, minHold } = ctx.params;
  const rows = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    let s = 0;
    let l = 0;
    for (let k = e - long + 1; k <= e; k++) {
      const dv = b[k].close * b[k].volume;
      l += dv;
      if (k > e - short) s += dv;
    }
    if (l > 0 && Number.isFinite(s)) rows.push([sym, s, l]);
  }
  if (rows.length < minNames) return ew(universe);
  const S = rows.reduce((p, x) => p + x[1], 0);
  const Lt = rows.reduce((p, x) => p + x[2], 0);
  if (!(S > 0 && Lt > 0)) return ew(universe);
  const scored = rows.map((x) => [x[0], x[1] / S / (x[2] / Lt) - 1]);
  const K = Math.max(minHold, Math.round(share * scored.length));
  const out = {};
  for (const [sym] of order(scored, true).slice(0, K)) out[sym] = 1 / K;
  return out;
}
