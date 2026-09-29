// Ichimoku Cloud breakout + Tenkan/Kijun cross
// Long when price closes above Kumo cloud AND Tenkan crosses above Kijun
// Exit when price closes back inside/below cloud OR Tenkan crosses below Kijun

export const meta = {
  id: "wide-social-ta-ichimoku-cloud-breakout",
  name: "Ichimoku Cloud breakout + Tenkan/Kijun cross (wide US stocks)",
  family: "social-ta",
  source: "YouTube Ichimoku strategy tutorials, r/algotrading Ichimoku threads",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  longShort: true,
  params: {
    tenkanPeriod: 9,
    kijunPeriod: 26,
    senkouBPeriod: 52,
    displacement: 26,
  },
};

// Helper: highest high over last n bars
function highestHigh(bars, i, n) {
  let max = bars[Math.max(0, i - n + 1)].high;
  for (let k = Math.max(0, i - n + 1); k <= i; k++) {
    max = Math.max(max, bars[k].high);
  }
  return max;
}

// Helper: lowest low over last n bars
function lowestLow(bars, i, n) {
  let min = bars[Math.max(0, i - n + 1)].low;
  for (let k = Math.max(0, i - n + 1); k <= i; k++) {
    min = Math.min(min, bars[k].low);
  }
  return min;
}

export function signal(bars, i, ctx) {
  const p = ctx.params;

  // Need enough history for the longest calculation (52-period Senkou B)
  if (i + 1 < p.senkouBPeriod) return 0;

  // Calculate Tenkan-sen (9-period)
  const tenkanHigh = highestHigh(bars, i, p.tenkanPeriod);
  const tenkanLow = lowestLow(bars, i, p.tenkanPeriod);
  const tenkan = (tenkanHigh + tenkanLow) / 2;

  // Calculate Kijun-sen (26-period)
  const kijunHigh = highestHigh(bars, i, p.kijunPeriod);
  const kijunLow = lowestLow(bars, i, p.kijunPeriod);
  const kijun = (kijunHigh + kijunLow) / 2;

  // Calculate Senkou Span A = (Tenkan + Kijun) / 2
  const senkouA = (tenkan + kijun) / 2;

  // Calculate Senkou Span B (52-period displaced by 26)
  const spanBHigh = highestHigh(bars, i, p.senkouBPeriod);
  const spanBLow = lowestLow(bars, i, p.senkouBPeriod);
  const senkouB = (spanBHigh + spanBLow) / 2;

  // Kumo cloud is the max of Senkou A/B as upper bound, min as lower bound
  const kumoHigh = Math.max(senkouA, senkouB);
  const kumoLow = Math.min(senkouA, senkouB);

  // Current price
  const price = bars[i].close;

  // Initialize state to track previous values
  if (!ctx.state.prevTenkan) {
    ctx.state.prevTenkan = tenkan;
    ctx.state.prevKijun = kijun;
    ctx.state.inTrade = 0;
  }

  // Previous values
  const prevTenkan = ctx.state.prevTenkan;
  const prevKijun = ctx.state.prevKijun;
  const inTrade = ctx.state.inTrade;

  // Update state for next iteration
  ctx.state.prevTenkan = tenkan;
  ctx.state.prevKijun = kijun;

  // Check for Tenkan/Kijun cross
  const tenkanCrossedAbove = prevTenkan <= prevKijun && tenkan > kijun;
  const tenkanCrossedBelow = prevTenkan >= prevKijun && tenkan < kijun;

  let signal = 0;

  if (inTrade === 0) {
    // Not in a trade: look for entry signals
    if (price > kumoHigh && tenkanCrossedAbove) {
      // Long entry
      signal = 1;
      ctx.state.inTrade = 1;
    } else if (price < kumoLow && tenkanCrossedBelow) {
      // Short entry
      signal = -1;
      ctx.state.inTrade = -1;
    }
  } else if (inTrade === 1) {
    // In a long trade: check for exit
    if (price <= kumoLow || tenkanCrossedBelow) {
      signal = 0;
      ctx.state.inTrade = 0;
    } else {
      signal = 1;
    }
  } else if (inTrade === -1) {
    // In a short trade: check for exit
    if (price >= kumoHigh || tenkanCrossedAbove) {
      signal = 0;
      ctx.state.inTrade = 0;
    } else {
      signal = -1;
    }
  }

  return signal;
}
