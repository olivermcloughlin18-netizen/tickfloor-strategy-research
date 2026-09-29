export const meta = {
  id: "s29-us-pocket-pivot",
  name: "Pocket pivot volume signature",
  family: "momentum",
  source: "Morales & Kacher 2010 'Trade Like an O'Neil Disciple' (pocket pivots)",
  assetClass: "us_stock",
  timeframe: "1d",
  assets: [
    "AAPL", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "V", "UNH", "XOM",
    "JNJ", "COST", "ABBV", "MRK", "AVGO", "CVX", "WMT", "BAC", "ORCL", "ADBE",
    "CRM", "NFLX", "AMD", "INTC", "ABT", "MCD", "DIS", "QCOM", "TXN", "HON",
    "CAT", "LOW", "SBUX", "BA", "UPS", "PFE", "T", "MDT", "UNP", "MMM",
  ],
  longShort: false,
  holdBars: 10,
  params: { downLookback: 10, sma: 50, extension: 1.05, holdBars: 10 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (i < p.sma || bars[i].close <= bars[i - 1].close) return 0;

  let maxDownVolume = 0;
  for (let k = i - p.downLookback; k < i; k++) {
    if (bars[k].close < bars[k - 1].close && bars[k].volume > maxDownVolume) {
      maxDownVolume = bars[k].volume;
    }
  }

  const sma50 = ctx.sma("close", p.sma, i);
  const sma10 = ctx.sma("close", p.downLookback, i);
  return bars[i].volume > maxDownVolume &&
    bars[i].close > sma50 &&
    bars[i].close <= p.extension * sma10 ? 1 : 0;
}
