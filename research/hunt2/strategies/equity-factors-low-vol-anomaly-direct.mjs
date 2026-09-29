export const meta = {
  id: "equity-factors-low-vol-anomaly-direct",
  name: "Low-volatility anomaly (direct, 60m realized vol)",
  family: "volatility",
  source: "Baker-Bradley-Wurgler / Frazzini-Pedersen low-vol anomaly",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_DAILY",
  rebalance: "monthly",
  longShort: true,
  params: {
    lookbackMonths: 60,
    barsPerMonth: 21,
    decile: 0.2, // quintile
  },
};

export function rank(universe, t, ctx) {
  const n = ctx.params.lookbackMonths * ctx.params.barsPerMonth;
  const scores = [];

  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < n + 1) continue;
    const window = b.slice(b.length - n);
    let sum = 0;
    const rets = [];
    for (let k = 1; k < window.length; k++) {
      const r = window[k].close / window[k - 1].close - 1;
      rets.push(r);
      sum += r;
    }
    const mean = sum / rets.length;
    let variance = 0;
    for (const r of rets) variance += (r - mean) * (r - mean);
    variance /= rets.length - 1;
    scores.push({ sym, vol: Math.sqrt(variance) });
  }

  if (scores.length < 10) return {};
  scores.sort((a, b) => a.vol - b.vol); // ascending: lowest vol first

  const nDecile = Math.max(1, Math.floor(scores.length * ctx.params.decile));
  const lowVol = scores.slice(0, nDecile);
  const highVol = scores.slice(-nDecile);

  const w = {};
  for (const s of lowVol) w[s.sym] = 0.5 / lowVol.length;
  for (const s of highVol) w[s.sym] = -0.5 / highVol.length;
  return w;
}
