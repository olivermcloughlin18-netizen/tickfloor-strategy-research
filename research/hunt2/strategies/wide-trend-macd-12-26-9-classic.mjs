// Classic MACD(12,26,9) trend-following crossover, tested on GLD (catalogue rule allows
// SPY/GLD/commodity ETF; GLD used directly, no proxy needed -- GLD is not holdout).
export const meta = {
  id: "wide-trend-macd-12-26-9-classic",
  name: "Classic MACD(12,26,9) crossover (GLD) (wide US stocks)",
  family: "trend",
  source: "Appel, 'Technical Analysis: Power Tools for Active Investors'",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  params: { fast: 12, slow: 26, signalN: 9 },
};

// MACD line = EMA(fast) - EMA(slow) of close. Signal = EMA(signalN) of MACD line.
// ctx.ema only gives EMA of raw fields, so we keep our own EMA-of-MACD in ctx.state.
export function signal(bars, i, ctx) {
  const { fast, slow, signalN } = ctx.params;
  if (i + 1 < slow + signalN) return 0;

  const emaFast = ctx.ema("close", fast, i);
  const emaSlow = ctx.ema("close", slow, i);
  if (Number.isNaN(emaFast) || Number.isNaN(emaSlow)) return 0;
  const macd = emaFast - emaSlow;

  if (ctx.state.macdSignal === undefined) {
    // Seed the signal EMA once enough MACD values could exist: use current macd as seed.
    ctx.state.macdSignal = macd;
    ctx.state.prevMacd = macd;
    ctx.state.prevSignal = macd;
    return 0;
  }
  const alpha = 2 / (signalN + 1);
  const newSignal = macd * alpha + ctx.state.macdSignal * (1 - alpha);
  const prevMacd = ctx.state.prevMacd;
  const prevSignal = ctx.state.macdSignal;

  ctx.state.prevMacd = macd;
  ctx.state.macdSignal = newSignal;

  if (ctx.state.pos === undefined) ctx.state.pos = 0;
  if (prevMacd <= prevSignal && macd > newSignal) ctx.state.pos = 1;
  else if (prevMacd >= prevSignal && macd < newSignal) ctx.state.pos = 0;
  return ctx.state.pos;
}
