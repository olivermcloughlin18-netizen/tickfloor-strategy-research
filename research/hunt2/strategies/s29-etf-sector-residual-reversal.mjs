export const meta = {
  id: "s29-etf-sector-residual-reversal",
  name: "Sector ETF one-month residual reversal vs QQQ",
  family: "mean_reversion",
  source: "Blitz, Huij, Lansdorp & Verbeek 2013 JFM (short-term residual reversal), applied to sector ETFs",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "QQQ"],
  rebalance: "weekly",
  longShort: false,
  params: { betaWindow: 252, horizon: 21, top: 3 },
};

const SECTORS = ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB"];

export function rank(universe, t, ctx) {
  const { betaWindow, horizon, top } = ctx.params;
  const qqq = universe.QQQ;
  if (!qqq || qqq.length < betaWindow + 1) return {};

  const scores = [];
  for (const sym of SECTORS) {
    const bars = universe[sym];
    if (!bars || bars.length < betaWindow + 1) continue;

    const sectorStart = bars.length - betaWindow;
    const qqqStart = qqq.length - betaWindow;
    let sectorMean = 0;
    let qqqMean = 0;
    for (let j = 0; j < betaWindow; j++) {
      sectorMean += bars[sectorStart + j].close / bars[sectorStart + j - 1].close - 1;
      qqqMean += qqq[qqqStart + j].close / qqq[qqqStart + j - 1].close - 1;
    }
    sectorMean /= betaWindow;
    qqqMean /= betaWindow;

    let covariance = 0;
    let variance = 0;
    for (let j = 0; j < betaWindow; j++) {
      const sectorReturn = bars[sectorStart + j].close / bars[sectorStart + j - 1].close - 1;
      const qqqReturn = qqq[qqqStart + j].close / qqq[qqqStart + j - 1].close - 1;
      covariance += (sectorReturn - sectorMean) * (qqqReturn - qqqMean);
      variance += (qqqReturn - qqqMean) ** 2;
    }
    if (!(variance > 0)) continue;

    const beta = covariance / variance;
    const sector21R = bars[bars.length - 1].close / bars[bars.length - 1 - horizon].close - 1;
    const qqq21R = qqq[qqq.length - 1].close / qqq[qqq.length - 1 - horizon].close - 1;
    const residual = sector21R - beta * qqq21R;
    if (Number.isFinite(residual)) scores.push([sym, residual]);
  }

  scores.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  if (scores.length < top) return {};

  const weights = {};
  for (const [sym] of scores.slice(0, top)) weights[sym] = 1 / top;
  return weights;
}
