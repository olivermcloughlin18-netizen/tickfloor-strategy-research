export const meta = {
  "id": "dv-ctrl-s29-cx-fng-cond-mom",
  "name": "Matched buy-after-drop control for s29-cx-fng-cond-mom",
  "family": "deep-validation-control",
  "source": "robustness-0929.md (pre-registered matched-frequency dumb control)",
  "assetClass": "crypto",
  "timeframe": "1d",
  "assets": [
    "BTCUSDT",
    "BNBUSDT",
    "XRPUSDT",
    "ADAUSDT",
    "DOGEUSDT",
    "LTCUSDT",
    "LINKUSDT",
    "TRXUSDT",
    "BCHUSDT",
    "ATOMUSDT",
    "ETCUSDT",
    "DASHUSDT",
    "ZECUSDT",
    "AVAXUSDT",
    "UNIUSDT",
    "NEARUSDT",
    "AAVEUSDT",
    "HBARUSDT"
  ],
  "rebalance": "weekly",
  "params": {
    "n": 5,
    "k": 5,
    "gross": 0.9987
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
