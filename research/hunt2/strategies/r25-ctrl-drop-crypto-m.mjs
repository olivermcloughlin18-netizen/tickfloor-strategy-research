// prereg-2026-09-25 control: monthly crypto buy-after-a-drop, the 7 coins with the lowest
// 21-session return, equal weight. Matched to r25-crypto-btcbeta-low (7 names, monthly).
export const meta = {
  id: "r25-ctrl-drop-crypto-m",
  name: "Control: crypto 1-month drop, bottom 7, monthly",
  family: "deep-validation-control",
  source: "Preregistered matched buy-after-a-drop control",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "monthly",
  params: { need: 23, lag: 2, minNames: 8, lookback: 21, hold: 7 },
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
  const { need, lag, minNames, lookback, hold } = ctx.params;
  const rows = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    const r = b[e].close / b[e - lookback].close - 1;
    if (Number.isFinite(r)) rows.push([sym, r]);
  }
  if (rows.length < minNames) return ew(universe);
  const out = {};
  for (const [sym] of order(rows, false).slice(0, hold)) out[sym] = 1 / hold;
  return out;
}
