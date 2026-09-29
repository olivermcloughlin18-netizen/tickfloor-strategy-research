export const meta = {
  "id": "dv-ctrl-s29-etf-dynamic-hedge-selection",
  "name": "Matched buy-after-drop control for s29-etf-dynamic-hedge-selection",
  "family": "deep-validation-control",
  "source": "robustness-0929.md (pre-registered matched-frequency dumb control)",
  "assetClass": "etf",
  "timeframe": "1d",
  "assets": [
    "QQQ",
    "TLT",
    "IEF",
    "SHY",
    "AGG",
    "LQD",
    "GLD",
    "UUP"
  ],
  "rebalance": "monthly",
  "params": {
    "n": 2,
    "k": 5,
    "gross": 1
  }
};
export function rank(universe, t, ctx) {
  const { n, k, gross } = ctx.params;
  const rows = [];
  for (const s of Object.keys(universe)) { const b = universe[s]; if (b.length > k) rows.push([s, b[b.length - 1].close / b[b.length - 1 - k].close - 1]); }
  rows.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  const top = rows.slice(0, n), w = {};
  for (const [s] of top) w[s] = gross / top.length;
  return w;
}
