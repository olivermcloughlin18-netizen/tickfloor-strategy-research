export const meta = {
  id: "wide-social-ta-adx-di-cross",
  name: "ADX(14)>25 filter with +DI/-DI cross (wide US stocks)",
  family: "social-ta",
  source: "TradingView/YouTube ADX+DMI strategy tutorials",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  longShort: true,
  params: { adxLength: 14, adxThreshold: 25, exitAdxThreshold: 20 },
};

function trueRange(curr, prev) {
  if (!prev) return curr.high - curr.low;
  const h = curr.high;
  const l = curr.low;
  const c = prev.close;
  return Math.max(h - l, Math.abs(h - c), Math.abs(l - c));
}

function plusDM(curr, prev) {
  if (!prev) return 0;
  const hh = curr.high - prev.high;
  const ll = prev.low - curr.low;
  if (hh <= 0 && ll <= 0) return 0;
  if (hh > ll) return hh;
  return 0;
}

function minusDM(curr, prev) {
  if (!prev) return 0;
  const hh = curr.high - prev.high;
  const ll = prev.low - curr.low;
  if (hh <= 0 && ll <= 0) return 0;
  if (ll > hh) return ll;
  return 0;
}

export function signal(bars, i, ctx) {
  const len = ctx.params.adxLength;
  const adxThresh = ctx.params.adxThreshold;
  const exitAdxThresh = ctx.params.exitAdxThreshold;

  if (i + 1 < len + 1) return 0; // need at least len+1 bars for ADX

  if (!ctx.state) {
    ctx.state = {
      plusDMSum: 0,
      minusDMSum: 0,
      trSum: 0,
      smoothedPlusDM: 0,
      smoothedMinusDM: 0,
      smoothedTR: 0,
      adx: 0,
      prevPlusDI: 0,
      prevMinusDI: 0,
      prevSignal: 0,
    };
  }

  const s = ctx.state;

  // Calculate on first bar with enough history
  if (i === len) {
    let pSum = 0, mSum = 0, tSum = 0;
    for (let k = 1; k <= len; k++) {
      const curr = bars[k];
      const prev = bars[k - 1];
      pSum += plusDM(curr, prev);
      mSum += minusDM(curr, prev);
      tSum += trueRange(curr, prev);
    }
    s.plusDMSum = pSum;
    s.minusDMSum = mSum;
    s.trSum = tSum;
    s.smoothedPlusDM = pSum;
    s.smoothedMinusDM = mSum;
    s.smoothedTR = tSum;
  } else if (i > len) {
    // Wilder's smoothing
    const curr = bars[i];
    const prev = bars[i - 1];
    const pDM = plusDM(curr, prev);
    const mDM = minusDM(curr, prev);
    const tr = trueRange(curr, prev);

    s.smoothedPlusDM = s.smoothedPlusDM - s.smoothedPlusDM / len + pDM;
    s.smoothedMinusDM = s.smoothedMinusDM - s.smoothedMinusDM / len + mDM;
    s.smoothedTR = s.smoothedTR - s.smoothedTR / len + tr;
  }

  // Calculate +DI and -DI
  const plusDI =
    s.smoothedTR > 0 ? (s.smoothedPlusDM / s.smoothedTR) * 100 : 0;
  const minusDI =
    s.smoothedTR > 0 ? (s.smoothedMinusDM / s.smoothedTR) * 100 : 0;
  const diDiff = Math.abs(plusDI - minusDI);
  const diSum = plusDI + minusDI;
  const di = diSum > 0 ? diDiff / diSum : 0;

  // ADX smoothing (after first ADX value at i = 2*len)
  if (i === 2 * len) {
    s.adx = di * 100;
  } else if (i > 2 * len) {
    s.adx = (s.adx * (len - 1) + di * 100) / len;
  } else if (i > len) {
    s.adx = di * 100;
  }

  const adx = s.adx;

  // Signal generation with cross logic
  let signal = 0;

  if (adx > adxThresh) {
    // Long: +DI crosses above -DI
    if (s.prevPlusDI <= s.prevMinusDI && plusDI > minusDI) {
      signal = 1;
    }
    // Short: -DI crosses above +DI
    else if (s.prevMinusDI <= s.prevPlusDI && minusDI > plusDI) {
      signal = -1;
    }
    // Hold existing position if no cross
    else {
      signal = s.prevSignal;
    }
  }

  // Exit on ADX fall or opposite cross
  if (s.prevSignal === 1) {
    if (adx < exitAdxThresh || minusDI > plusDI) {
      signal = 0;
    }
  } else if (s.prevSignal === -1) {
    if (adx < exitAdxThresh || plusDI > minusDI) {
      signal = 0;
    }
  }

  s.prevPlusDI = plusDI;
  s.prevMinusDI = minusDI;
  s.prevSignal = signal;

  return signal;
}
