// Livermore pivotal point breakout with pyramiding strategy
// Find swing highs tested 2+ times, enter 20% on breakout with volume confirmation,
// add 20% on each new leg, exit on close below pivot.

export const meta = {
  id: "wide-trader-books-livermore-pivotal-point",
  name: "Livermore pivotal point breakout with pyramiding (wide US stocks)",
  family: "trader-books",
  source: "Jesse Livermore, Edwin Lefevre's Reminiscences of a Stock Operator",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  params: {
    swingWindow: 20,        // lookback for swing high identification
    volumeMultiplier: 1.0,  // volume confirmation threshold (1.0x average)
    pyramidLegPct: 5,       // new leg size in % (+5%)
    avgVolWindow: 20,       // average volume lookback
  },
};

export function signal(bars, i, ctx) {
  const { swingWindow, volumeMultiplier, pyramidLegPct, avgVolWindow } = ctx.params;

  // Initialize state
  if (!ctx.state.inPosition) {
    ctx.state.position = 0;
    ctx.state.entryPrice = null;
    ctx.state.entryPrices = [];
    ctx.state.inPosition = false;
  }

  if (i < swingWindow + avgVolWindow) return 0;

  const bar = bars[i];
  const avgVol = getAvgVolume(bars, i, avgVolWindow);

  // Calculate swing high as highest close in last swingWindow bars (excluding current)
  let swingHigh = -Infinity;
  for (let k = Math.max(0, i - swingWindow); k < i; k++) {
    if (bars[k].close > swingHigh) {
      swingHigh = bars[k].close;
    }
  }

  // Exit: close below swing high
  if (ctx.state.inPosition && bar.close < swingHigh) {
    ctx.state.inPosition = false;
    ctx.state.position = 0;
    ctx.state.entryPrice = null;
    ctx.state.entryPrices = [];
    return 0;
  }

  // Entry: breakout above prior swing high with above-average volume
  if (!ctx.state.inPosition && bar.close > swingHigh && bar.volume > avgVol * volumeMultiplier) {
    ctx.state.inPosition = true;
    ctx.state.position = 1;
    ctx.state.entryPrice = bar.close;
    ctx.state.entryPrices = [bar.close];
    return 1;
  }

  // Pyramiding: add on new legs
  if (ctx.state.inPosition && ctx.state.position < 5 && ctx.state.entryPrice) {
    const legThreshold = ctx.state.entryPrice * (1 + (pyramidLegPct * ctx.state.position) / 100);

    if (bar.close > legThreshold) {
      ctx.state.position++;
      ctx.state.entryPrices.push(bar.close);
      return 1;
    }
  }

  // Maintain position
  if (ctx.state.inPosition) return 1;

  return 0;
}

function getAvgVolume(bars, i, window) {
  let sum = 0;
  const start = Math.max(0, i - window + 1);
  for (let k = start; k <= i; k++) {
    sum += bars[k].volume;
  }
  return sum / (i - start + 1);
}
