export const meta = {
  id: "s29-etf-eaa",
  name: "Elastic Asset Allocation (golden defensive)",
  family: "momentum",
  source: "Keller & Butler 2014 SSRN ('Elastic Asset Allocation (EAA)')",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "DIA", "XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "VNQ", "GLD", "DBC", "TLT", "IEF", "SHY"],
  rebalance: "monthly",
  longShort: false,
  params: { wR: 1, wC: 0.5, wV: 0.5, wS: 2, top: 4, window: 252 },
};

export function rank(universe, t, ctx) {
  const risky = meta.assets.slice(0, 16);
  const n = ctx.params.window;
  const returns = [];

  for (const sym of risky) {
    const bars = universe[sym];
    if (!bars || bars.length < n + 1) return universe.SHY ? { SHY: 1 } : {};
    const rs = [];
    for (let i = bars.length - n; i < bars.length; i++) {
      rs.push(bars[i].close / bars[i - 1].close - 1);
    }
    returns.push(rs);
  }

  const market = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (const rs of returns) sum += rs[i];
    market.push(sum / risky.length);
  }
  let marketMean = 0;
  for (const x of market) marketMean += x;
  marketMean /= n;

  let positive = 0;
  const scores = [];
  for (let a = 0; a < risky.length; a++) {
    const sym = risky[a];
    const bars = universe[sym];
    const end = bars.length - 1;
    const momentum = (
      bars[end].close / bars[end - 21].close - 1
      + bars[end].close / bars[end - 63].close - 1
      + bars[end].close / bars[end - 126].close - 1
      + bars[end].close / bars[end - 252].close - 1
    ) / 4;
    if (momentum <= 0) continue;
    positive++;

    const rs = returns[a];
    let mean = 0;
    for (const x of rs) mean += x;
    mean /= n;
    let variance = 0;
    let covariance = 0;
    let marketVariance = 0;
    for (let i = 0; i < n; i++) {
      const dx = rs[i] - mean;
      const dy = market[i] - marketMean;
      variance += dx * dx;
      covariance += dx * dy;
      marketVariance += dy * dy;
    }
    const volatility = Math.sqrt(variance / (n - 1));
    const correlation = covariance / Math.sqrt(variance * marketVariance);
    const z = (momentum ** ctx.params.wR * (1 - correlation) ** ctx.params.wC / volatility ** ctx.params.wV) ** (ctx.params.wS + 1e-6);
    if (z > 0) scores.push([sym, z]);
  }

  if (!scores.length) return universe.SHY ? { SHY: 1 } : {};
  scores.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const selected = scores.slice(0, ctx.params.top);
  let total = 0;
  for (const [, z] of selected) total += z;
  const cash = (risky.length - positive) / risky.length;
  const weights = { SHY: cash };
  for (const [sym, z] of selected) weights[sym] = (1 - cash) * z / total;
  return weights;
}
