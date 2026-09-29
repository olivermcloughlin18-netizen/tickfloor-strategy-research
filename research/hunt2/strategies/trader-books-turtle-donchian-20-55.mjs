// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "trader-books-turtle-donchian-20-55",
  name: "Turtle 20/55 Donchian breakout",
  family: "trend",
  source: "Curtis Faith, 'The Complete TurtleTrader' (2007); original 1983 rules",
  assetClass: "crypto",
  timeframe: "1d",
  longShort: true,
  params: {
    s1EntryDays: 20,      // System 1: 20-day high entry
    s2EntryDays: 55,      // System 2: 55-day high entry
    s1ExitDays: 10,       // System 1: 10-day low exit
    s2ExitDays: 20,       // System 2: 20-day low exit
    atrDays: 20           // ATR window for stop loss
  }
};

function atr(bars, i, window) {
  if (i + 1 < window) return null;
  let sumTR = 0;
  for (let k = i - window + 1; k <= i; k++) {
    const prevClose = k > 0 ? bars[k - 1].close : bars[k].close;
    const tr = Math.max(
      bars[k].high - bars[k].low,
      Math.abs(bars[k].high - prevClose),
      Math.abs(bars[k].low - prevClose)
    );
    sumTR += tr;
  }
  return sumTR / window;
}

function highestHigh(bars, startIdx, endIdx) {
  let h = bars[startIdx].high;
  for (let k = startIdx + 1; k <= endIdx; k++) {
    h = Math.max(h, bars[k].high);
  }
  return h;
}

function lowestLow(bars, startIdx, endIdx) {
  let l = bars[startIdx].low;
  for (let k = startIdx + 1; k <= endIdx; k++) {
    l = Math.min(l, bars[k].low);
  }
  return l;
}

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const p = ctx.params;
  const close = bars[i].close;
  const atrVal = atr(bars, i, p.atrDays);

  if (atrVal === null) return 0;

  // Initialize state on first call
  if (!ctx.state.initialized) {
    ctx.state.initialized = true;
    ctx.state.inTrade = false;
    ctx.state.entryPrice = 0;
    ctx.state.entrySystem = 0;  // which system triggered entry (1 or 2)
  }

  // --- CHECK EXITS ---
  if (ctx.state.inTrade) {
    let shouldExit = false;

    // Check stop loss: 2*ATR from entry price
    const stop = ctx.state.entryPrice - 2 * atrVal;
    if (close <= stop) {
      shouldExit = true;
    }

    // Check exit signals based on which system triggered entry
    if (!shouldExit) {
      if (ctx.state.entrySystem === 1) {
        // System 1 exit: 10-day low
        const low10Idx = Math.max(0, i - p.s1ExitDays + 1);
        const low10 = lowestLow(bars, low10Idx, i);
        if (close <= low10) {
          shouldExit = true;
        }
      } else if (ctx.state.entrySystem === 2) {
        // System 2 exit: 20-day low
        const low20Idx = Math.max(0, i - p.s2ExitDays + 1);
        const low20 = lowestLow(bars, low20Idx, i);
        if (close <= low20) {
          shouldExit = true;
        }
      }
    }

    if (shouldExit) {
      ctx.state.inTrade = false;
      return 0;
    } else {
      return 1;  // stay in trade
    }
  } else {
    // No position, check for entry signals

    // System 1: 20-day high breakout (close > highest high of previous 20 days)
    if (i >= p.s1EntryDays) {
      const high20Idx = i - p.s1EntryDays;
      const high20 = highestHigh(bars, high20Idx, i - 1);

      if (close > high20) {
        ctx.state.inTrade = true;
        ctx.state.entryPrice = close;
        ctx.state.entrySystem = 1;
        return 1;
      }
    }

    // System 2: 55-day high breakout (only if System 1 didn't trigger)
    if (i >= p.s2EntryDays) {
      const high55Idx = i - p.s2EntryDays;
      const high55 = highestHigh(bars, high55Idx, i - 1);

      if (close > high55) {
        ctx.state.inTrade = true;
        ctx.state.entryPrice = close;
        ctx.state.entrySystem = 2;
        return 1;
      }
    }

    return 0;
  }
}
