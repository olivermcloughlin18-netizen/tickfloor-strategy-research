// prereg-2026-09-25 B6: size, proxied by 30-session dollar volume (market caps are not in the
// harness); hold the K smallest, weekly.
export const meta = {
  id: "r25-crypto-small-dv",
  name: "Crypto small size (lowest 30-session dollar volume), weekly",
  family: "equity-factors",
  source: "Liu, Tsyvinski & Wu 2022 JF (crypto size factor); dollar volume as the size proxy",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "weekly",
  params: { need: 32, lag: 2, minNames: 8, window: 30, share: 0.3, minHold: 3 },
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
  const { need, lag, minNames, window, share, minHold } = ctx.params;
  const rows = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    let s = 0;
    for (let k = e - window + 1; k <= e; k++) s += b[k].close * b[k].volume;
    if (s > 0 && Number.isFinite(s)) rows.push([sym, s]);
  }
  if (rows.length < minNames) return ew(universe);
  const K = Math.max(minHold, Math.round(share * rows.length));
  const out = {};
  for (const [sym] of order(rows, false).slice(0, K)) out[sym] = 1 / K;
  return out;
}
