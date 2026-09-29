// Equal-weight ensemble of weak technical signals, majority vote
// Combines 5 signals: SMA20>SMA50, RSI14, MACD, 20-day return, volume z-score
// Long if >=3 of 5 signals are bullish

export const meta = {
  id: "wide-mlq-ensemble-weak-signals",
  name: "Equal-weight ensemble of weak technical signals, majority vote (wide US stocks)",
  family: "ml-quant-modern",
  source: "QuantConnect/Quantopian community ensemble-signal writeups",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  params: { sma20: 20, sma50: 50, rsi14: 14, macd12: 12, macd26: 26, macd9: 9, returnDays: 20, volDays: 20 },
};

function sma(bars, i, n) {
  if (i + 1 < n) return null;
  let sum = 0;
  for (let k = i - n + 1; k <= i; k++) sum += bars[k].close;
  return sum / n;
}

function ema(bars, i, n, prevEma) {
  if (i === 0) return bars[0].close;
  if (prevEma === null || prevEma === undefined) {
    // Use SMA for initial EMA
    if (i + 1 < n) return null;
    let sum = 0;
    for (let k = i - n + 1; k <= i; k++) sum += bars[k].close;
    return sum / n;
  }
  const multiplier = 2 / (n + 1);
  return bars[i].close * multiplier + prevEma * (1 - multiplier);
}

function rsi(bars, i, n) {
  if (i + 1 < n + 1) return null; // Need n+1 bars for RSI (n changes)
  let gains = 0, losses = 0;
  for (let k = i - n; k < i; k++) {
    const change = bars[k + 1].close - bars[k].close;
    if (change > 0) gains += change;
    else losses += -change;
  }
  const avgGain = gains / n;
  const avgLoss = losses / n;
  if (avgLoss === 0) return avgGain > 0 ? 100 : 50;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function updateEMA(ctx, bars, i) {
  // Initialize state on first call
  if (!ctx.state.ema12) {
    ctx.state.ema12 = null;
    ctx.state.ema26 = null;
    ctx.state.macdLine = null;
    ctx.state.macdSignal = null;
  }

  const m12 = 2 / (ctx.params.macd12 + 1);
  const m26 = 2 / (ctx.params.macd26 + 1);
  const m9 = 2 / (ctx.params.macd9 + 1);

  // Update EMA12
  if (i === 0) {
    ctx.state.ema12 = bars[0].close;
  } else if (ctx.state.ema12 !== null) {
    ctx.state.ema12 = bars[i].close * m12 + ctx.state.ema12 * (1 - m12);
  } else if (i >= ctx.params.macd12 - 1) {
    // Initialize with SMA12
    let sum = 0;
    for (let k = i - ctx.params.macd12 + 1; k <= i; k++) sum += bars[k].close;
    ctx.state.ema12 = sum / ctx.params.macd12;
  }

  // Update EMA26
  if (i === 0) {
    ctx.state.ema26 = bars[0].close;
  } else if (ctx.state.ema26 !== null) {
    ctx.state.ema26 = bars[i].close * m26 + ctx.state.ema26 * (1 - m26);
  } else if (i >= ctx.params.macd26 - 1) {
    // Initialize with SMA26
    let sum = 0;
    for (let k = i - ctx.params.macd26 + 1; k <= i; k++) sum += bars[k].close;
    ctx.state.ema26 = sum / ctx.params.macd26;
  }

  // Calculate MACD line
  if (ctx.state.ema12 !== null && ctx.state.ema26 !== null) {
    const newMacd = ctx.state.ema12 - ctx.state.ema26;

    // Update signal line (EMA9 of MACD)
    if (ctx.state.macdLine === null) {
      ctx.state.macdLine = newMacd;
      if (i >= ctx.params.macd26 + ctx.params.macd9 - 2) {
        ctx.state.macdSignal = newMacd; // Initialize
      }
    } else if (i >= ctx.params.macd26 + ctx.params.macd9 - 2) {
      if (ctx.state.macdSignal === null) {
        ctx.state.macdSignal = newMacd;
      } else {
        ctx.state.macdSignal = newMacd * m9 + ctx.state.macdSignal * (1 - m9);
      }
    }
    ctx.state.macdLine = newMacd;
  }
}

function volumeZScore(bars, i, n) {
  if (i + 1 < n) return null;
  let sum = 0, sumSq = 0;
  for (let k = i - n + 1; k <= i; k++) {
    sum += bars[k].volume;
    sumSq += bars[k].volume * bars[k].volume;
  }
  const mean = sum / n;
  const variance = (sumSq / n) - (mean * mean);
  const stddev = variance > 0 ? Math.sqrt(variance) : 0;
  if (stddev === 0) return 0;
  return (bars[i].volume - mean) / stddev;
}

export function signal(bars, i, ctx) {
  const p = ctx.params;

  // Update EMA states for MACD
  updateEMA(ctx, bars, i);

  // Need at least 50 bars to have all signals
  if (i + 1 < 50) return 0;

  // Signal 1: SMA20 > SMA50
  const sma20 = sma(bars, i, p.sma20);
  const sma50 = sma(bars, i, p.sma50);
  const sig1 = (sma20 !== null && sma50 !== null && sma20 > sma50) ? 1 : 0;

  // Signal 2: RSI14 < 30 (bullish long)
  const rsiVal = rsi(bars, i, p.rsi14);
  const sig2 = (rsiVal !== null && rsiVal < 30) ? 1 : 0;

  // Signal 3: MACD line > signal line
  const sig3 = (ctx.state.macdLine !== null && ctx.state.macdSignal !== null && ctx.state.macdLine > ctx.state.macdSignal) ? 1 : 0;

  // Signal 4: 20-day return > 0
  const sig4 = (bars[i].close > bars[i - p.returnDays].close) ? 1 : 0;

  // Signal 5: Volume z-score > 1
  const volZ = volumeZScore(bars, i, p.volDays);
  const sig5 = (volZ !== null && volZ > 1) ? 1 : 0;

  const totalSignals = sig1 + sig2 + sig3 + sig4 + sig5;

  // Long if >=3 of 5 signals bullish
  return totalSignals >= 3 ? 1 : 0;
}
