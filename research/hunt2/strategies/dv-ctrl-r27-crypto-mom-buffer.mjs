export const meta = {
  "id": "dv-ctrl-r27-crypto-mom-buffer",
  "name": "Matched buy-after-drop control for r27-crypto-mom-buffer",
  "family": "deep-validation-control",
  "source": "robustness-0929.md (pre-registered matched-frequency dumb control)",
  "assetClass": "crypto",
  "timeframe": "1d",
  "universe": "CRYPTO_DAILY",
  "rebalance": "weekly",
  "params": {
    "n": 5,
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
