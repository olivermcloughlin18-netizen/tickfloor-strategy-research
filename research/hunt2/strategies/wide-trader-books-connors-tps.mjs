// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "wide-trader-books-connors-tps",
  name: "Connors TPS (Time-Price-Sequence) triple pullback (wide US stocks)",
  family: "mean_reversion",
  source: "Larry Connors TPS strategy",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  params: {},
};

function calcRSI(bars, period, endIdx) {
  if (endIdx < period) return null;
  let up = 0, down = 0;
  for (let i = endIdx - period + 1; i <= endIdx; i++) {
    const change = bars[i].close - bars[i - 1].close;
    if (change > 0) up += change;
    else down -= change;
  }
  const avgUp = up / period;
  const avgDown = down / period;
  if (avgDown === 0) return avgUp > 0 ? 100 : 0;
  return 100 - (100 / (1 + avgUp / avgDown));
}

function calcSMA(bars, period, endIdx) {
  if (endIdx < period - 1) return null;
  let sum = 0;
  for (let i = endIdx - period + 1; i <= endIdx; i++) sum += bars[i].close;
  return sum / period;
}

export function signal(bars, i, ctx) {
  // Initialize state
  if (ctx.state.inPosition === undefined) {
    ctx.state.inPosition = false;
  }

  // Need 201 bars for 200-day SMA
  if (i < 200) return 0;

  const sma200 = calcSMA(bars, 200, i);
  const sma5 = calcSMA(bars, 5, i);
  const rsi = calcRSI(bars, 2, i);
  const prevRsi = i >= 1 ? calcRSI(bars, 2, i - 1) : null;

  // If position open, check exit conditions
  if (ctx.state.inPosition) {
    // Exit if RSI(2) > 70 or close > 5d SMA
    if (rsi !== null && rsi > 70) {
      ctx.state.inPosition = false;
      return 0;
    }
    if (sma5 !== null && bars[i].close > sma5) {
      ctx.state.inPosition = false;
      return 0;
    }
    // Continue holding
    return 1;
  }

  // No position: look for entry
  // Filter: price > 200d SMA
  if (bars[i].close <= sma200) return 0;

  // Look for entry condition: RSI(2) < 25 crosses down after being > 60 within 5 days
  if (rsi === null) return 0;

  // Check if RSI(2) < 25 and crossed down
  const crossedDown = prevRsi !== null && prevRsi >= 25 && rsi < 25;
  if (!crossedDown) return 0;

  // Check if RSI(2) > 60 within last 5 days
  let sawHigh = false;
  for (let k = Math.max(i - 4, 0); k <= i; k++) {
    const rsiCheck = calcRSI(bars, 2, k);
    if (rsiCheck !== null && rsiCheck > 60) {
      sawHigh = true;
      break;
    }
  }

  if (sawHigh) {
    ctx.state.inPosition = true;
    return 1;
  }

  return 0;
}
