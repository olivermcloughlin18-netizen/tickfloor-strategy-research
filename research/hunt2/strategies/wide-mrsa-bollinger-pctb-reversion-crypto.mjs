export const meta = {
  id: "wide-mrsa-bollinger-pctb-reversion-crypto",
  name: "Bollinger %B reversion on large-cap crypto (wide US stocks)",
  family: "mean-reversion-statarb",
  source: "John Bollinger's writings; widespread crypto retail use",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  longShort: true,
  params: { smaWindow: 20, bbStdDev: 2, rsiWindow: 14 },
};

export function signal(bars, i, ctx) {
  // Need enough bars
  if (i + 1 < 20) return 0;

  // SMA
  let sum = 0;
  for (let k = i - 19; k <= i; k++) sum += bars[k].close;
  const sma = sum / 20;

  // StdDev
  let sq = 0;
  for (let k = i - 19; k <= i; k++) {
    const d = bars[k].close - sma;
    sq += d * d;
  }
  const std = Math.sqrt(sq / 20);

  const upper = sma + 2 * std;
  const lower = sma - 2 * std;
  const pctB = (upper > lower) ? (bars[i].close - lower) / (upper - lower) : 0.5;

  // Need enough bars for RSI (14+1)
  if (i + 1 < 15) return 0;

  // RSI
  let u = 0, d = 0;
  for (let k = i - 13; k < i; k++) {
    const delta = bars[k + 1].close - bars[k].close;
    if (delta > 0) u += delta;
    else d -= delta;
  }
  const rsi = (d === 0) ? 100 : 100 - 100 / (1 + u / d);

  // Entry signals
  if (pctB < 0.05 && rsi < 30) {
    return 1;
  }
  if (pctB > 0.95 && rsi > 70) {
    return -1;
  }

  return 0;
}
