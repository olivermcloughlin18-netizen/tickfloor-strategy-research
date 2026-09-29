// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "wide-trader-books-vantharp-percent-risk-atr-trail",
  name: "Van Tharp fixed-% risk with ATR chandelier trailing exit (wide US stocks)",
  family: "volatility",
  source: "Van Tharp, 'Trade Your Way to Financial Freedom' (1998)",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  params: { atrWindow: 20, atrMultiplier: 3 },
};

// Calculate True Range
function trueRange(bar, prevClose) {
  const hl = bar.high - bar.low;
  const hc = Math.abs(bar.high - prevClose);
  const lc = Math.abs(bar.low - prevClose);
  return Math.max(hl, hc, lc);
}

// Calculate ATR
function calculateATR(bars, i, atrWindow) {
  if (i < atrWindow - 1) return 0;
  let trSum = 0;
  for (let k = i - atrWindow + 1; k <= i; k++) {
    const prevClose = k > 0 ? bars[k - 1].close : bars[0].close;
    trSum += trueRange(bars[k], prevClose);
  }
  return trSum / atrWindow;
}

export function signal(bars, i, ctx) {
  const { atrWindow, atrMultiplier } = ctx.params;

  // Initialize state
  if (!ctx.state) {
    ctx.state = {
      inPosition: false,
      entryBar: -1,
      highestClose: 0,
      entryPrice: 0
    };
  }

  // Need enough data for ATR calculation
  if (i < atrWindow - 1) return 0;

  const currentClose = bars[i].close;
  const atr = calculateATR(bars, i, atrWindow);

  // If currently not in position
  if (!ctx.state.inPosition) {
    // Entry rule: enter on simple momentum (close > previous bar's high)
    if (i > 0 && currentClose > bars[i - 1].high) {
      ctx.state.inPosition = true;
      ctx.state.entryBar = i;
      ctx.state.entryPrice = currentClose;
      ctx.state.highestClose = currentClose;
      return 1;
    }
    return 0;
  }

  // If in position, manage the trailing stop
  // Update highest close
  if (currentClose > ctx.state.highestClose) {
    ctx.state.highestClose = currentClose;
  }

  // Calculate chandelier trailing stop
  const trailingStop = ctx.state.highestClose - (atrMultiplier * atr);

  // Exit if price closes below trailing stop
  if (currentClose < trailingStop) {
    ctx.state.inPosition = false;
    ctx.state.entryBar = -1;
    return 0;
  }

  // Stay in position
  return 1;
}
