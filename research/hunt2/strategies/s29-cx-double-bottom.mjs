export const meta = {
  id: "s29-cx-double-bottom",
  name: "Double-bottom neckline breakout",
  family: "trend",
  source: "Bulkowski 2005 'Encyclopedia of Chart Patterns' (double bottoms, Eve & Eve / Adam & Adam); Lo, Mamaysky & Wang 2000 JF (pattern recognition)",
  assetClass: "crypto",
  timeframe: "1d",
  assets: [
    "BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT",
    "LINKUSDT", "TRXUSDT", "BCHUSDT", "ATOMUSDT", "ETCUSDT", "DASHUSDT",
    "ZECUSDT", "AVAXUSDT", "UNIUSDT", "NEARUSDT", "AAVEUSDT", "HBARUSDT",
  ],
  longShort: false,
  holdBars: 20,
  params: { swing: 5, minSep: 10, maxSep: 60, tol: 0.04, neckRise: 0.1, holdBars: 20 },
};

function isSwingLow(bars, p, swing) {
  const low = bars[p].low;
  for (let k = p - swing; k <= p + swing; k++) {
    if (bars[k].low < low) return false;
  }
  return true;
}

export function signal(bars, i, ctx) {
  const { swing, minSep, maxSep, tol, neckRise } = ctx.params;
  if (i < 70) return 0;

  let p2 = -1;
  for (let p = i - swing; p >= swing; p--) {
    if (isSwingLow(bars, p, swing)) {
      p2 = p;
      break;
    }
  }
  if (p2 < 0) return 0;

  let p1 = -1;
  for (let p = p2 - minSep; p >= swing && p >= p2 - maxSep; p--) {
    if (isSwingLow(bars, p, swing)) {
      p1 = p;
      break;
    }
  }
  if (p1 < 0) return 0;

  const low1 = bars[p1].low;
  const low2 = bars[p2].low;
  if (Math.abs(low2 / low1 - 1) > tol) return 0;

  let neckline = bars[p1].high;
  for (let p = p1 + 1; p <= p2; p++) neckline = Math.max(neckline, bars[p].high);
  if (neckline < (1 + neckRise) * Math.max(low1, low2)) return 0;

  return bars[i].close > neckline && bars[i - 1].close <= neckline ? 1 : 0;
}
