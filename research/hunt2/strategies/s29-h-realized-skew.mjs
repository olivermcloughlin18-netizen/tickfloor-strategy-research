export const meta = {
  id: "s29-h-realized-skew",
  name: "24-hour realized skewness reversal",
  family: "mean_reversion",
  source: "Amaya, Christoffersen, Jacobs & Vasquez 2015 JFE (realized skewness negatively predicts returns), applied as a time-series signal",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  longShort: true,
  holdBars: 24,
  params: { window: 24, thr: 1, holdBars: 24 },
};

export function signal(bars, i, ctx) {
  const n = ctx.params.window;
  if (i < n) return 0;
  const r = [];
  let m = 0;
  for (let k = i - n + 1; k <= i; k++) { const x = Math.log(bars[k].close / bars[k - 1].close); r.push(x); m += x; }
  m /= n;
  let m2 = 0, m3 = 0;
  for (const x of r) { const d = x - m; m2 += d * d; m3 += d * d * d; }
  m2 /= n; m3 /= n;
  const skew = m2 === 0 ? 0 : m3 / Math.pow(m2, 1.5);
  if (skew <= -ctx.params.thr) return 1;
  if (skew >= ctx.params.thr) return -1;
  return 0;
}
