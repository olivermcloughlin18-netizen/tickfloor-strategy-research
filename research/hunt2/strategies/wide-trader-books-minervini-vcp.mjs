// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "wide-trader-books-minervini-vcp",
  name: "Minervini VCP (volatility contraction pattern) (wide US stocks)",
  family: "volatility",
  source: "Mark Minervini SEPA/VCP",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "weekly",
  params: {
    sma50: 50,
    sma150: 150,
    sma200: 200,
    sma200TrendMonths: 21,  // 1 month of trading days
    priceWithin52wHigh: 0.25,
    priceAbove52wLow: 0.30,
    volumeRatio: 1.5,
    avgVolPeriod: 50,
    contractionMinCount: 2,
    maxHoldingPeriod: 10,
  },
};

function sma(bars, period, fromIdx) {
  if (fromIdx + 1 < period) return null;
  let sum = 0;
  for (let k = fromIdx - period + 1; k <= fromIdx; k++) {
    sum += bars[k].close;
  }
  return sum / period;
}

function highLow(bars, period, fromIdx) {
  if (fromIdx + 1 < period) return { high: null, low: null };
  let high = -Infinity, low = Infinity;
  for (let k = fromIdx - period + 1; k <= fromIdx; k++) {
    high = Math.max(high, bars[k].high);
    low = Math.min(low, bars[k].low);
  }
  return { high, low };
}

function getWeeklyRanges(bars, fromIdx) {
  // Group bars into weeks and get ranges
  // Assumes bars are ordered chronologically
  if (fromIdx < 4) return [];

  const ranges = [];
  let i = 0;
  while (i <= fromIdx) {
    const weekEnd = Math.min(i + 4, fromIdx);
    let weekHigh = -Infinity, weekLow = Infinity;
    for (let k = i; k <= weekEnd; k++) {
      weekHigh = Math.max(weekHigh, bars[k].high);
      weekLow = Math.min(weekLow, bars[k].low);
    }
    ranges.push(weekHigh - weekLow);
    i = weekEnd + 1;
  }
  return ranges;
}

function hasContractions(ranges, minContractions) {
  if (ranges.length < minContractions + 1) return false;

  let contractionCount = 0;
  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i] < ranges[i - 1]) {
      contractionCount++;
    }
  }
  return contractionCount >= minContractions;
}

function avgVolume(bars, period, fromIdx) {
  if (fromIdx + 1 < period) return 0;
  let sum = 0;
  for (let k = fromIdx - period + 1; k <= fromIdx; k++) {
    sum += bars[k].volume;
  }
  return sum / period;
}

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const scores = [];

  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    const i = bars.length - 1;

    // Need minimum history
    if (i < Math.max(p.sma200, 252)) continue;

    const price = bars[i].close;
    const sma50 = sma(bars, p.sma50, i);
    const sma150 = sma(bars, p.sma150, i);
    const sma200 = sma(bars, p.sma200, i);

    // Check SMA200 trending up 1+ month
    const sma200Prev = sma(bars, p.sma200, Math.max(0, i - p.sma200TrendMonths));

    // 52-week high/low
    const hl52w = highLow(bars, 252, i);

    if (!sma50 || !sma150 || !sma200 || !sma200Prev || !hl52w.high) continue;

    // Rule 1: Price > 150d and 200d SMA
    if (price <= sma150 || price <= sma200) continue;

    // Rule 2: 200d SMA trending up 1+ month
    if (sma200Prev >= sma200) continue;

    // Rule 3: 50d SMA above 150d/200d
    if (sma50 <= sma150 || sma50 <= sma200) continue;

    // Rule 4: Price within 25% of 52w high
    const priceFromHigh = (hl52w.high - price) / hl52w.high;
    if (priceFromHigh < 0 || priceFromHigh > p.priceWithin52wHigh) continue;

    // Rule 5: Price >= 30% above 52w low
    const priceFromLow = (price - hl52w.low) / hl52w.low;
    if (priceFromLow < p.priceAbove52wLow) continue;

    // Rule 6: Identify >= 2 contractions of weekly range
    const ranges = getWeeklyRanges(bars, i);
    if (!hasContractions(ranges, p.contractionMinCount)) continue;

    // Rule 7: Check volume >= 1.5x 50-day avg
    const avgVol = avgVolume(bars, p.avgVolPeriod, i);
    if (bars[i].volume < avgVol * p.volumeRatio) continue;

    // Score based on proximity to 52w high and SMA alignment
    const score = (sma50 - sma200) / sma200 + priceFromHigh;
    scores.push([sym, score]);
  }

  // Return equal weight for top candidates
  scores.sort((x, y) => y[1] - x[1]);
  const top = scores.slice(0, 5);

  const w = {};
  if (top.length > 0) {
    for (const [sym] of top) {
      w[sym] = 1 / top.length;
    }
  }
  return w;
}
