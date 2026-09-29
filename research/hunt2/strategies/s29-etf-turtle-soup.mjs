export const meta = {
  id: "s29-etf-turtle-soup",
  name: "Turtle Soup: failed 20-day breakdown recovered the same day",
  family: "mean_reversion",
  source: "Raschke & Connors 1995 'Street Smarts' (Turtle Soup)",
  assetClass: "etf",
  timeframe: "1d",
  assets: [
    "QQQ", "DIA", "XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY",
    "XLU", "XLB", "XLC", "VNQ", "TLT", "IEF", "SHY", "LQD", "HYG",
    "AGG", "GLD", "SLV", "USO", "UNG", "DBC", "UUP",
  ],
  longShort: false,
  holdBars: 5,
  params: { channel: 20, minAge: 4, holdBars: 5 },
};

export function signal(bars, i, ctx) {
  const { channel, minAge } = ctx.params;
  if (i < channel + 1) return 0;

  let priorLow = Infinity;
  for (let k = i - channel; k < i; k++) {
    if (bars[k].low < priorLow) priorLow = bars[k].low;
  }

  let recentLow = Infinity;
  for (let k = i - minAge + 1; k < i; k++) {
    if (bars[k].low < recentLow) recentLow = bars[k].low;
  }

  return recentLow > priorLow && bars[i].low < priorLow && bars[i].close > priorLow ? 1 : 0;
}
