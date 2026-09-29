// Liquidation cascade mean-reversion: flag when 1h return <-4% with volume >4x MA(20),
// enter long at close of cascade bar, exit after 24h or +3%, stop -3%. Symmetric short.

export const meta = {
  id: "crypto-liquidation-cascade-fade",
  name: "Liquidation cascade mean-reversion",
  family: "mean_reversion",
  source: "CryptoQuant/Glassnode liquidation research notes",
  assetClass: "crypto",
  timeframe: "1h",
  longShort: true,
  params: {
    returnThreshold: 0.04,      // ±4% return threshold for cascade
    volumeMultiplier: 4,        // volume > 4x MA(20)
    holdBars: 24,               // hold for 24 hours (24 bars)
    profitTarget: 0.03,         // exit at +3%
    stopLoss: 0.03              // exit at -3%
  },
};

export function signal(bars, i, ctx) {
  const { returnThreshold, volumeMultiplier, holdBars, profitTarget, stopLoss } = ctx.params;

  // Need at least 20 bars for volume MA
  if (i + 1 < 20) return 0;

  // Initialize state on first call
  if (!ctx.state) {
    ctx.state = {
      inTrade: false,
      entryBar: -1,
      entryPrice: 0,
      tradeDirection: 0
    };
  }

  const state = ctx.state;
  const bar = bars[i];

  // Calculate 1h return (from open to close)
  const hourReturn = (bar.close - bar.open) / bar.open;

  // Calculate 20-bar volume MA
  let volSum = 0;
  for (let k = i - 19; k <= i; k++) {
    volSum += bars[k].volume;
  }
  const volMA = volSum / 20;

  // Check exit conditions if in trade
  if (state.inTrade) {
    const barsSinceEntry = i - state.entryBar;
    const returnFromEntry = (bar.close - state.entryPrice) / state.entryPrice;

    // Exit on: 24-bar hold, +3% profit, or -3% loss
    if (barsSinceEntry >= holdBars ||
        returnFromEntry >= profitTarget ||
        returnFromEntry <= -stopLoss) {
      state.inTrade = false;
      return 0;
    }

    // Stay in trade
    return state.tradeDirection;
  }

  // Check for cascade entry conditions when flat
  // Long cascade: hourly return < -4% AND volume > 4x MA(20)
  const isLongCascade = hourReturn < -returnThreshold && bar.volume > volumeMultiplier * volMA;

  // Short cascade: hourly return > +4% AND volume > 4x MA(20)
  const isShortCascade = hourReturn > returnThreshold && bar.volume > volumeMultiplier * volMA;

  if (isLongCascade) {
    state.inTrade = true;
    state.entryBar = i;
    state.entryPrice = bar.close;
    state.tradeDirection = 1;
    return 1;
  }

  if (isShortCascade) {
    state.inTrade = true;
    state.entryBar = i;
    state.entryPrice = bar.close;
    state.tradeDirection = -1;
    return -1;
  }

  return 0;
}
