// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "trend-channel-breakout-atr-stop",
  name: "Price channel breakout with ATR trailing stop (managed-futures style)",
  family: "trend-managed-futures",
  source: "Public CTA methodology descriptions (Man AHL, Winton whitepapers)",
  assetClass: "etf",
  timeframe: "1d",
  longShort: true,
  params: {
    channelWindow: 55,
    atrWindow: 20,
    atrMultiplier: 3
  },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const { channelWindow, atrWindow, atrMultiplier } = ctx.params;

  if (!ctx.state) {
    ctx.state = {
      position: 0,  // 0=flat, 1=long, -1=short
      highestCloseSinceEntry: 0,
      lowestCloseSinceEntry: Infinity,
    };
  }

  const minBarsNeeded = Math.max(channelWindow, atrWindow) + 1;
  if (i + 1 < minBarsNeeded) return 0;

  const state = ctx.state;
  const current = bars[i];

  // Calculate ATR(20)
  let atrSum = 0;
  for (let k = i - atrWindow + 1; k <= i; k++) {
    const high = bars[k].high;
    const low = bars[k].low;
    const prevClose = k > 0 ? bars[k - 1].close : bars[k].low;
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    atrSum += tr;
  }
  const atr = atrSum / atrWindow;

  // Calculate 55-day channel (high and low) from previous bars only
  let channelHigh = -Infinity;
  let channelLow = Infinity;
  const startIdx = Math.max(0, i - channelWindow + 1);
  for (let k = startIdx; k < i; k++) {
    channelHigh = Math.max(channelHigh, bars[k].close);
    channelLow = Math.min(channelLow, bars[k].close);
  }

  if (state.position === 1) {
    // In long position: trail stop at 3x ATR below highest close
    state.highestCloseSinceEntry = Math.max(state.highestCloseSinceEntry, current.close);
    const trailingStop = state.highestCloseSinceEntry - atrMultiplier * atr;

    if (current.close < trailingStop) {
      state.position = 0;
      return 0;  // Exit long
    }
    return 1;  // Stay long
  } else if (state.position === -1) {
    // In short position: trail stop at 3x ATR above lowest close
    state.lowestCloseSinceEntry = Math.min(state.lowestCloseSinceEntry, current.close);
    const trailingStop = state.lowestCloseSinceEntry + atrMultiplier * atr;

    if (current.close > trailingStop) {
      state.position = 0;
      return 0;  // Exit short
    }
    return -1;  // Stay short
  } else {
    // Flat: check for breakout entry
    if (current.close > channelHigh) {
      state.position = 1;
      state.highestCloseSinceEntry = current.close;
      return 1;  // Enter long
    } else if (current.close < channelLow) {
      state.position = -1;
      state.lowestCloseSinceEntry = current.close;
      return -1;  // Enter short
    }
    return 0;  // Stay flat
  }
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
