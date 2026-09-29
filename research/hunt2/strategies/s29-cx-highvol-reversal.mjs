export const meta = {
  "id": "s29-cx-highvol-reversal",
  "name": "Weekly reversal among coins with abnormal volume",
  "family": "mean_reversion",
  "source": "Bianchi, Babiak & Dickerson 2022 JBF ('Trading volume and liquidity provision in cryptocurrency markets')",
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
    "recent": 7,
    "base": 60,
    "top": 4,
    "minNames": 8
  }
};

export function rank(universe, t, ctx) {
  const { recent, base, top, minNames } = ctx.params;
  const need = recent + base;
  const rows = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    const n = b.length;
    if (n < need) continue;
    let r = 0, o = 0;
    for (let k = n - recent; k < n; k++) r += b[k].volume;
    for (let k = n - need; k < n - recent; k++) o += b[k].volume;
    if (!(o > 0)) continue;
    rows.push({ sym, av: (r / recent) / (o / base), r7: b[n - 1].close / b[n - 1 - recent].close - 1 });
  }
  if (rows.length < minNames) return {};
  const a = rows.map((x) => x.av).sort((x, y) => x - y);
  const m = a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
  const kept = rows.filter((x) => x.av >= m).sort((x, y) => x.r7 - y.r7).slice(0, top);
  const w = {};
  for (const x of kept) w[x.sym] = 1 / top;
  return w;
}
