// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "trader-books-connors-rsi2",
  name: "Connors RSI(2) mean reversion",
  family: "trader-books",
  source: "Larry Connors RSI2",
  assetClass: "us_stock",
  timeframe: "1d",
  params: {},
};

function sma(bars, i, period) {
  if (i + 1 < period) return null;
  let sum = 0;
  for (let k = i - period + 1; k <= i; k++) sum += bars[k].close;
  return sum / period;
}

function rsi(bars, i, period) {
  if (i + 1 < period + 1) return null;
  let gains = 0, losses = 0;
  for (let k = i - period; k < i; k++) {
    const change = bars[k + 1].close - bars[k].close;
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export function signal(bars, i, ctx) {
  if (i + 1 < 201) return 0;

  const sma200 = sma(bars, i, 200);
  if (!sma200) return 0;

  const close = bars[i].close;
  const priceAboveSma200 = close > sma200;
  if (!priceAboveSma200) return 0;

  const rsi2 = rsi(bars, i, 2);
  if (rsi2 === null) return 0;

  if (!ctx.state) ctx.state = { inTrade: false, entryBar: -1 };

  if (!ctx.state.inTrade) {
    if (rsi2 < 10) {
      ctx.state.inTrade = true;
      ctx.state.entryBar = i;
      return 1;
    }
    return 0;
  } else {
    const barsHeld = i - ctx.state.entryBar;

    if (rsi2 > 70) {
      ctx.state.inTrade = false;
      return 0;
    }

    const sma5 = sma(bars, i, 5);
    if (sma5 && close > sma5) {
      ctx.state.inTrade = false;
      return 0;
    }

    if (barsHeld >= 10) {
      ctx.state.inTrade = false;
      return 0;
    }

    return 1;
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
