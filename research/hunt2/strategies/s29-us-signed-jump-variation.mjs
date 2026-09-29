export const meta = {
  "id": "s29-us-signed-jump-variation",
  "name": "Good minus bad volatility (signed jump variation)",
  "family": "volatility",
  "source": "Bollerslev, Li & Zhao 2020 JFQA ('Good volatility, bad volatility, and the cross section of stock returns'), daily-return adaptation",
  "assetClass": "us_stock",
  "timeframe": "1d",
  "universe": "US_STOCKS_DAILY",
  "rebalance": "monthly",
  "params": {
    "window": 63,
    "top": 8
  }
};

export function rank(universe, t, ctx) {
  const W = ctx.params.window, sc = [];
  for (const k of Object.keys(universe)) {
    const b = universe[k];
    if (b.length < W + 1) continue;
    let p = 0, n = 0;
    for (let j = b.length - W; j < b.length; j++) {
      const r = b[j].close / b[j - 1].close - 1;
      if (r > 0) p += r * r; else if (r < 0) n += r * r;
    }
    if (p + n === 0) continue;
    sc.push([k, (p - n) / (p + n)]);
  }
  sc.sort((a, b) => a[1] - b[1]);
  const top = sc.slice(0, ctx.params.top), w = {};
  for (const [k] of top) w[k] = 1 / ctx.params.top;
  return w;
}
