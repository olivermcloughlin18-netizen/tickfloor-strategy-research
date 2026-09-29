export const meta = {
  id: "s29-h-rsi-divergence",
  name: "Hourly bullish RSI divergence",
  family: "mean_reversion",
  source: "Wilder 1978 'New Concepts in Technical Trading Systems' (RSI divergence); Murphy 1999 'Technical Analysis of the Financial Markets'",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  longShort: false,
  holdBars: 12,
  params: { rsi: 14, from: 48, to: 13, gap: 5, rsiMax: 40, holdBars: 12 },
};

export function signal(bars, i, ctx) {
  if (i < 62) return 0;

  let j = i - ctx.params.from;
  for (let k = j + 1; k <= i - ctx.params.to; k++) {
    if (bars[k].close < bars[j].close) j = k;
  }

  const currentRsi = ctx.rsi(ctx.params.rsi, i);
  return bars[i].close < bars[j].close &&
    currentRsi >= ctx.rsi(ctx.params.rsi, j) + ctx.params.gap &&
    currentRsi < ctx.params.rsiMax ? 1 : 0;
}
