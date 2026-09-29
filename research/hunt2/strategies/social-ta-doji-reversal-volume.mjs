// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "social-ta-doji-reversal-volume",
  name: "Doji at extreme + volume spike reversal",
  family: "momentum",
  source: "TikTok 'doji candle secret' and volume-spike reversal reels",
  assetClass: "crypto",
  timeframe: "1d",
  longShort: true,
  params: {
    doji_body_ratio: 0.1,
    extreme_period: 20,
    volume_multiplier: 1.5,
    atr_multiplier: 1.5,
    hold_bars: 8
  }
};

function is_doji(bar, ratio) {
  const body = Math.abs(bar.close - bar.open);
  const range = bar.high - bar.low;
  if (range === 0) return false;
  return body < ratio * range;
}

function calculate_atr(bars, i) {
  const n = 14;
  const start = Math.max(0, i - n + 1);
  let sum = 0;
  for (let k = start; k <= i; k++) {
    sum += bars[k].high - bars[k].low;
  }
  return sum / (i - start + 1);
}

function get_average_volume(bars, i, period) {
  const start = Math.max(0, i - period + 1);
  let sum = 0;
  for (let k = start; k <= i; k++) {
    sum += bars[k].volume;
  }
  return sum / (i - start + 1);
}

function is_at_20bar_low(bars, i) {
  const curr_low = bars[i].low;
  for (let k = Math.max(0, i - 19); k < i; k++) {
    if (bars[k].low < curr_low) return false;
  }
  return true;
}

function is_at_20bar_high(bars, i) {
  const curr_high = bars[i].high;
  for (let k = Math.max(0, i - 19); k < i; k++) {
    if (bars[k].high > curr_high) return false;
  }
  return true;
}

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const p = ctx.params;

  if (!ctx.state) {
    ctx.state = {
      entry_bar: -1,
      entry_type: 0,
      entry_price: 0
    };
  }

  // Check if we're in a trade
  if (ctx.state.entry_type !== 0) {
    const bars_held = i - ctx.state.entry_bar;
    const atr = calculate_atr(bars, i);

    if (ctx.state.entry_type === 1) {
      // Check long exit: +1.5*ATR or 8 bars
      if (bars[i].close >= ctx.state.entry_price + p.atr_multiplier * atr || bars_held >= p.hold_bars) {
        ctx.state.entry_type = 0;
        return 0;
      }
      return 1;
    } else {
      // Check short exit: -1.5*ATR or 8 bars
      if (bars[i].close <= ctx.state.entry_price - p.atr_multiplier * atr || bars_held >= p.hold_bars) {
        ctx.state.entry_type = 0;
        return 0;
      }
      return -1;
    }
  }

  // Not in trade, look for entry
  if (i < 1) return 0;  // Need at least 2 bars

  const prev = bars[i - 1];
  const curr = bars[i];

  // Check if previous bar was a doji setup
  const prev_is_doji = is_doji(prev, p.doji_body_ratio);
  const prev_vol_avg = get_average_volume(bars, i - 1, p.extreme_period);
  const prev_vol_spike = prev.volume > p.volume_multiplier * prev_vol_avg;
  const prev_at_low = is_at_20bar_low(bars, i - 1);
  const prev_at_high = is_at_20bar_high(bars, i - 1);

  // Check for setup
  if (prev_is_doji && prev_vol_spike) {
    if (prev_at_low && curr.close > prev.high) {
      // Long entry with confirmation
      ctx.state.entry_bar = i;
      ctx.state.entry_type = 1;
      ctx.state.entry_price = curr.close;
      return 1;
    } else if (prev_at_high && curr.close < prev.low) {
      // Short entry with confirmation
      ctx.state.entry_bar = i;
      ctx.state.entry_type = -1;
      ctx.state.entry_price = curr.close;
      return -1;
    }
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
