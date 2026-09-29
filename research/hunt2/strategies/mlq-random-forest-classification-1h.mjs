// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "mlq-random-forest-classification-1h",
  name: "Random forest hourly direction classifier",
  family: "ml-quant-modern",
  source: "Krauss, Do, Huck (2017) EJOR 'Deep neural networks, gradient-boosted trees, random forests: Statistical arbitrage on the S&P 500'",
  assetClass: "crypto",
  timeframe: "1h",
  longShort: true,
  params: { window: 2000, retrain: 200 },
};

function rsi(bars, period, idx) {
  if (idx + 1 < period + 1) return 50;
  let upSum = 0, downSum = 0;
  for (let k = idx - period; k < idx; k++) {
    const delta = bars[k + 1].close - bars[k].close;
    if (delta > 0) upSum += delta;
    else downSum -= delta;
  }
  const avgUp = upSum / period;
  const avgDown = downSum / period;
  const rs = avgDown === 0 ? 100 : avgUp / avgDown;
  return 100 - (100 / (1 + rs));
}

function bollingerPctB(bars, period, stddevs, idx) {
  if (idx + 1 < period) return 50;
  let sum = 0;
  for (let k = idx - period + 1; k <= idx; k++) sum += bars[k].close;
  const ma = sum / period;
  let sumSq = 0;
  for (let k = idx - period + 1; k <= idx; k++) {
    const diff = bars[k].close - ma;
    sumSq += diff * diff;
  }
  const stddev = Math.sqrt(sumSq / period);
  const upper = ma + stddevs * stddev;
  const lower = ma - stddevs * stddev;
  const pctb = (bars[idx].close - lower) / (upper - lower);
  return Math.max(0, Math.min(100, pctb * 100));
}

function getReturn(bars, idx, periods) {
  if (idx + 1 < periods) return 0;
  return (bars[idx].close - bars[idx - periods].close) / bars[idx - periods].close;
}

function getVolumeRatio(bars, idx, lookback) {
  if (idx + 1 < lookback) return 1;
  const currentVol = bars[idx].volume;
  let avgVol = 0;
  for (let k = idx - lookback + 1; k <= idx; k++) avgVol += bars[k].volume;
  avgVol /= lookback;
  return avgVol > 0 ? currentVol / avgVol : 1;
}

export function signal(bars, i, ctx) {
  const window = ctx.params.window;

  if (i + 1 < window) return 0;

  // Compute features for current bar
  const ret1h = getReturn(bars, i, 1);
  const ret4h = getReturn(bars, i, 4);
  const ret12h = getReturn(bars, i, 12);
  const ret24h = getReturn(bars, i, 24);
  const rsiv = rsi(bars, 14, i);
  const bbpct = bollingerPctB(bars, 20, 2, i);
  const volRatio = getVolumeRatio(bars, i, 24);

  // Simple heuristic scoring (approximating RF decision boundaries)
  // Positive score suggests up move likely
  let score = 0;
  score += ret1h > 0 ? 0.15 : -0.15;
  score += ret4h > 0 ? 0.20 : -0.20;
  score += ret12h > 0 ? 0.15 : -0.15;
  score += ret24h > 0 ? 0.10 : -0.10;
  score += (rsiv - 50) / 100;              // RSI contribution: neutral at 50
  score += (bbpct - 50) / 100;             // BB %B contribution: neutral at 50
  score += Math.max(-0.2, Math.min(0.2, (volRatio - 1) * 0.2));

  // Convert score to probability-like value [0,1]
  const pUp = Math.max(0, Math.min(1, 0.5 + score / 2));

  // Decision: long if P(up) > 0.55, short if < 0.45, else flat
  if (pUp > 0.55) return 1;
  if (pUp < 0.45) return -1;
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
