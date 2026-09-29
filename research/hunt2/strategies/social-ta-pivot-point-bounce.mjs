// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "social-ta-pivot-point-bounce",
  name: "Classic daily pivot point support/resistance bounce",
  family: "mean_reversion",
  source: "r/Daytrading pivot point threads, YouTube 'pivot point strategy' videos",
  assetClass: "crypto",
  timeframe: "1h",
  longShort: true,
  params: { atrPeriod: 14, maxHoldBars: 5 },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.

function getDateKey(time) {
  // time is Unix timestamp in seconds; return day number since epoch
  // ponytail: pure arithmetic, no Date calls
  return Math.floor(time / 86400);
}

function atr(bars, i, period) {
  let sum = 0;
  let count = 0;
  const start = Math.max(0, i - period + 1);
  for (let k = start; k <= i; k++) {
    let tr;
    if (k === 0) {
      tr = bars[k].high - bars[k].low;
    } else {
      const hl = bars[k].high - bars[k].low;
      const hc = Math.abs(bars[k].high - bars[k - 1].close);
      const lc = Math.abs(bars[k].low - bars[k - 1].close);
      tr = Math.max(hl, hc, lc);
    }
    sum += tr;
    count++;
  }
  return count > 0 ? sum / count : 0;
}

export function signal(bars, i, ctx) {
  const atrPeriod = ctx.params.atrPeriod;
  const maxHoldBars = ctx.params.maxHoldBars;

  // Initialize state (mutate existing object)
  if (i === 0) {
    ctx.state.prevDateKey = getDateKey(bars[0].time);
    ctx.state.dayHigh = bars[0].high;
    ctx.state.dayLow = bars[0].low;
    ctx.state.dayClose = bars[0].close;
    ctx.state.P = 0;
    ctx.state.S1 = 0;
    ctx.state.R1 = 0;
    ctx.state.inTrade = false;
    ctx.state.tradeType = 0;
    ctx.state.tradeBarCount = 0;
  }

  const state = ctx.state;
  const currentDateKey = getDateKey(bars[i].time);

  // On new day, calculate pivot points from previous day
  if (currentDateKey !== state.prevDateKey) {
    state.P = (state.dayHigh + state.dayLow + state.dayClose) / 3;
    state.S1 = 2 * state.P - state.dayHigh;
    state.R1 = 2 * state.P - state.dayLow;

    state.dayHigh = bars[i].high;
    state.dayLow = bars[i].low;
    state.prevDateKey = currentDateKey;
  } else {
    // Same day: track high/low
    state.dayHigh = Math.max(state.dayHigh, bars[i].high);
    state.dayLow = Math.min(state.dayLow, bars[i].low);
  }

  state.dayClose = bars[i].close;

  // Need at least one full day to have pivot points
  if (state.P === 0) return 0;

  const atrValue = atr(bars, i, atrPeriod);

  // Exit existing position
  if (state.inTrade) {
    state.tradeBarCount++;

    const exitLong = bars[i].close >= state.P ||
                     bars[i].close >= state.R1 ||
                     state.tradeBarCount >= maxHoldBars;
    const exitShort = bars[i].close <= state.P ||
                      bars[i].close <= state.S1 ||
                      state.tradeBarCount >= maxHoldBars;

    if ((state.tradeType === 1 && exitLong) || (state.tradeType === -1 && exitShort)) {
      state.inTrade = false;
      state.tradeType = 0;
      state.tradeBarCount = 0;
      return 0;
    }

    return state.tradeType;
  }

  // Entry logic
  const touchedS1 = bars[i].low <= state.S1 + 0.3 * atrValue;
  const closedAboveS1 = bars[i].close > state.S1;

  if (touchedS1 && closedAboveS1) {
    state.inTrade = true;
    state.tradeType = 1;
    state.tradeBarCount = 1;
    return 1;
  }

  // Short entry
  const touchedR1 = bars[i].high >= state.R1 - 0.3 * atrValue;
  const closedBelowR1 = bars[i].close < state.R1;

  if (touchedR1 && closedBelowR1) {
    state.inTrade = true;
    state.tradeType = -1;
    state.tradeBarCount = 1;
    return -1;
  }

  return 0;
}

// PORTFOLIO strategies (cross-sectional): delete signal() above and export rank() instead.
// Add to meta: universe: "US_STOCKS_DAILY" (or CRYPTO_DAILY / ETFS_DAILY), rebalance: "monthly" (or weekly / daily).
// universe[SYMBOL] = bars up to and including date t, for every asset that traded on t.
// Return weights {SYMBOL: weight}; weights >= 0 unless longShort, sum of |weights| <= 1, missing = 0.
//
// export function rank(universe, t, ctx) {
//   const scores = [];
//   for (const sym of Object.keys(universe)) {
//     const b = universe[sym];
//     if (b.length < 253) continue;
//     scores.push([sym, b[b.length - 22].close / b[b.length - 253].close - 1]);
//   }
//   scores.sort((x, y) => y[1] - x[1]);
//   const top = scores.slice(0, 4);
//   const w = {};
//   for (const [sym] of top) w[sym] = 1 / top.length;
//   return w;
// }
