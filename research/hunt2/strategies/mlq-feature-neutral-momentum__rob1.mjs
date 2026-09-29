// Volatility-neutralized cross-sectional momentum (residualized), crypto universe.
// Catalogue asked for 15-20 crypto with market-cap rank too; CoinGecko market-cap data
// isn't a supported ctx source, so the residual uses only 90d momentum vs 90d realized
// vol (the two factors we can compute from bars alone) -- a partial test of the rule.
export const meta = {
  id: "mlq-feature-neutral-momentum__rob1",
  name: "Vol-neutralized cross-sectional momentum (crypto) (-25%)",
  family: "momentum",
  source: "Asness, Moskowitz, Pedersen (2013) JF 'Value and Momentum Everywhere'",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "daily",
  params: { lookback: 68, topFrac: 0.2 },
};

// Cross-sectional OLS of momentum ~ a + b*vol, keep the residual, rank on it.
export function rank(universe, t, ctx) {
  const { lookback, topFrac } = ctx.params;
  const rows = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < lookback + 2) continue;
    const mom = b[b.length - 1].close / b[b.length - 1 - lookback].close - 1;
    let sumSq = 0;
    let n = 0;
    for (let k = b.length - lookback; k < b.length; k++) {
      const r = b[k].close / b[k - 1].close - 1;
      sumSq += r * r;
      n++;
    }
    const vol = Math.sqrt(sumSq / n);
    if (!Number.isFinite(mom) || !Number.isFinite(vol)) continue;
    rows.push({ sym, mom, vol });
  }
  if (rows.length < 6) return {};

  const nRows = rows.length;
  const meanX = rows.reduce((s, r) => s + r.vol, 0) / nRows;
  const meanY = rows.reduce((s, r) => s + r.mom, 0) / nRows;
  let sxy = 0;
  let sxx = 0;
  for (const r of rows) {
    sxy += (r.vol - meanX) * (r.mom - meanY);
    sxx += (r.vol - meanX) * (r.vol - meanX);
  }
  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = meanY - slope * meanX;
  for (const r of rows) r.resid = r.mom - (intercept + slope * r.vol);

  rows.sort((a, b) => b.resid - a.resid);
  const topN = Math.max(1, Math.round(nRows * topFrac));
  const top = rows.slice(0, topN);
  const w = {};
  for (const r of top) w[r.sym] = 1 / top.length;
  return w;
}
