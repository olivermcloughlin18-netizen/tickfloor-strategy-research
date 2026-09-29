// Earnings-day realized-volatility mean reversion (keyless proxy)
// Rules: flag earnings day as largest |return| in 63d + volume > 3x 20d avg.
// On day+1, if |return| > 8%, fade the move for 5 days.

export const meta = {
  id: "event-earnings-volatility-crush-proxy",
  name: "Earnings-day realized-volatility mean reversion (keyless proxy)",
  family: "mean_reversion",
  source: "De Bondt & Thaler (1985) Journal of Finance",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_DAILY",
  rebalance: "daily",
  longShort: true,
  params: {
    lookback: 63,
    volMultiplier: 3,
    returnThreshold: 0.08,
    holdDays: 5
  }
};

export function rank(universe, t, ctx) {
  if (!ctx.state) ctx.state = {};

  const weights = {};
  const p = ctx.params;

  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];

    // Need enough history for lookback + 20-day volume average
    if (bars.length < Math.max(p.lookback, 30) + 20) {
      weights[sym] = 0;
      if (ctx.state[sym]) delete ctx.state[sym];
      continue;
    }

    const i = bars.length - 1;

    // Check if we're currently holding a fade position
    if (ctx.state[sym]) {
      const info = ctx.state[sym];
      const barsSinceEntry = i - info.entryBar;

      if (barsSinceEntry < p.holdDays) {
        // Still holding
        weights[sym] = info.direction > 0 ? 0.5 : -0.5;
        continue;
      } else {
        // Hold period expired, exit
        delete ctx.state[sym];
        weights[sym] = 0;
        continue;
      }
    }

    // Calculate 20-day average volume
    let sumVol = 0;
    let volCount = 0;
    for (let k = Math.max(0, i - 19); k <= i; k++) {
      sumVol += bars[k].volume;
      volCount++;
    }
    const avgVol20 = sumVol / volCount;

    // Find largest |return| in lookback window
    let maxAbsReturn = 0;
    let maxReturnIdx = -1;
    let maxReturnSign = 0;

    for (let k = Math.max(1, i - p.lookback + 1); k <= i; k++) {
      const ret = (bars[k].close - bars[k - 1].close) / bars[k - 1].close;
      const absRet = Math.abs(ret);
      if (absRet > maxAbsReturn) {
        maxAbsReturn = absRet;
        maxReturnIdx = k;
        maxReturnSign = ret > 0 ? 1 : (ret < 0 ? -1 : 0);
      }
    }

    // Check if yesterday (bars[i-1]) was an earnings spike
    let weight = 0;
    if (i > 0 && maxReturnIdx === i - 1 &&
        maxAbsReturn > p.returnThreshold &&
        bars[maxReturnIdx].volume > p.volMultiplier * avgVol20) {

      // Yesterday was an earnings event, enter fade trade today
      if (maxReturnSign < 0) {
        // Dropped, so go long
        weight = 0.5;
        ctx.state[sym] = { entryBar: i, direction: 1 };
      } else if (maxReturnSign > 0) {
        // Rose, so go short
        weight = -0.5;
        ctx.state[sym] = { entryBar: i, direction: -1 };
      }
    }

    weights[sym] = weight;
  }

  // Normalize so sum of |weights| <= 1
  let totalAbsWeight = 0;
  for (const sym of Object.keys(weights)) {
    totalAbsWeight += Math.abs(weights[sym]);
  }

  if (totalAbsWeight > 1) {
    for (const sym of Object.keys(weights)) {
      weights[sym] /= totalAbsWeight;
    }
  }

  return weights;
}
