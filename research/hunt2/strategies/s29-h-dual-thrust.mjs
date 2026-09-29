// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "s29-h-dual-thrust",
  name: "Dual Thrust stop-and-reverse on UTC days",
  family: "trend",
  source: "Michael Chalek, Dual Thrust system (widely used in Chinese CTA practice; Pruitt 2016 'The Ultimate Algorithmic Trading System Toolbox')",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  longShort: true,
  params: { days: 4, k1: 0.5, k2: 0.5 },
};

// Return the position held from close i to close i + 1. Only completed UTC days
// enter the range; the current day's first hourly open fixes its thresholds.
export function signal(bars, i, ctx) {
  const bar = bars[i];
  const day = Math.floor(bar.time / 86400);
  const state = ctx.state;

  if (state.day === undefined) {
    state.day = day;
    state.high = bar.high;
    state.low = bar.low;
    state.close = bar.close;
    state.open = bar.open;
    state.completed = [];
    state.position = 0;
  } else if (day !== state.day) {
    state.completed.push({ high: state.high, low: state.low, close: state.close });
    if (state.completed.length > ctx.params.days) state.completed.shift();
    state.day = day;
    state.high = bar.high;
    state.low = bar.low;
    state.close = bar.close;
    state.open = bar.open;
  } else {
    if (bar.high > state.high) state.high = bar.high;
    if (bar.low < state.low) state.low = bar.low;
    state.close = bar.close;
  }

  if (state.completed.length < ctx.params.days) return state.position;

  let maxHigh = state.completed[0].high;
  let minLow = state.completed[0].low;
  let maxClose = state.completed[0].close;
  let minClose = state.completed[0].close;
  for (let k = 1; k < state.completed.length; k++) {
    const completed = state.completed[k];
    if (completed.high > maxHigh) maxHigh = completed.high;
    if (completed.low < minLow) minLow = completed.low;
    if (completed.close > maxClose) maxClose = completed.close;
    if (completed.close < minClose) minClose = completed.close;
  }

  const range = Math.max(maxHigh - minClose, maxClose - minLow);
  const buy = state.open + ctx.params.k1 * range;
  const sell = state.open - ctx.params.k2 * range;
  if (bar.close > buy) state.position = 1;
  else if (bar.close < sell) state.position = -1;
  return state.position;
}
