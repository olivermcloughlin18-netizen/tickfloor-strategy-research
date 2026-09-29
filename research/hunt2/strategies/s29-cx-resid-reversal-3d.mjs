export const meta = {
  id: "s29-cx-resid-reversal-3d",
  name: "Three-day BTC-residual reversal among alts",
  family: "mean_reversion",
  source: "Blitz, Huij, Lansdorp & Verbeek 2013 JFM (short-term residual reversal), with BTC as the market factor",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "daily",
  params: { betaWindow: 90, horizon: 3, top: 4, minNames: 8 },
};

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const btc = universe["BTCUSDT"];
  if (!btc) return {};
  const nb = btc.length;
  const need = p.betaWindow + p.horizon + 1;
  if (nb < need) return {};
  const scores = [];
  for (const sym of Object.keys(universe)) {
    if (sym === "BTCUSDT") continue;
    const b = universe[sym];
    const n = b.length;
    if (n < need) continue;
    // ponytail: aligned by index from the end; same-day only if both series end on day t (universe guarantees)
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let k = 0; k < p.betaWindow; k++) {
      const x = btc[nb - 1 - k].close / btc[nb - 2 - k].close - 1;
      const y = b[n - 1 - k].close / b[n - 2 - k].close - 1;
      sx += x; sy += y; sxx += x * x; sxy += x * y;
    }
    const m = p.betaWindow;
    const varx = sxx / m - (sx / m) ** 2;
    if (!(varx > 0)) continue;
    const beta = (sxy / m - (sx / m) * (sy / m)) / varx;
    const rb = btc[nb - 1].close / btc[nb - 1 - p.horizon].close - 1;
    const rs = b[n - 1].close / b[n - 1 - p.horizon].close - 1;
    scores.push([sym, rs - beta * rb]);
  }
  if (scores.length < p.minNames) return {};
  scores.sort((x, y) => x[1] - y[1]);
  const w = {};
  for (const [sym] of scores.slice(0, p.top)) w[sym] = 1 / p.top;
  return w;
}
