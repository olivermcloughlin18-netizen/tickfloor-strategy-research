// prereg r27-crypto-trend-invvol (C3, RISK_IMPROVER track): volatility-scaled crypto
// trend. Weekly rebalance across CRYPTO_DAILY. A coin gets weight 1/n scaled down by
// 0.03 / (30-day return sd) when its 28-day trend is up, 0 when it's down, and plain
// 1/n during warm-up (L < 32). Unallocated weight is cash.
// Moskowitz, Ooi & Pedersen 2012 JFE (volatility-scaled TSMOM); Barroso & Santa-Clara
// 2015 JFE; Zarattini, Pagani & Barbon 2025 (volatility-targeted crypto trend).

export const meta = {
  id: "r27-crypto-trend-invvol",
  name: "Crypto 4-week trend with per-coin volatility targeting",
  family: "volatility",
  source: "Moskowitz, Ooi & Pedersen 2012 JFE (volatility-scaled TSMOM); Barroso & Santa-Clara 2015 JFE; Zarattini, Pagani & Barbon 2025 (volatility-targeted crypto trend)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "weekly",
  params: { lag: 2, lookback: 28, volWindow: 30, dailyTarget: 0.03, need: 32 },
};

export function rank(universe, t, ctx) {
  const { lag, lookback, volWindow, dailyTarget, need } = ctx.params;
  const syms = Object.keys(universe);
  const n = syms.length;
  if (n === 0) return {};

  const w = {};
  for (const sym of syms) {
    const b = universe[sym];
    const L = b.length;

    if (L < need) { w[sym] = 1 / n; continue; }

    const e = L - lag;
    const trend = b[e].close > b[e - lookback].close;
    if (!trend) continue; // weight 0: leave unallocated (cash)

    let sum = 0;
    const rs = [];
    for (let k = e - volWindow + 1; k <= e; k++) {
      const r = b[k].close / b[k - 1].close - 1;
      rs.push(r);
      sum += r;
    }
    const mean = sum / rs.length;
    let varSum = 0;
    for (const r of rs) varSum += (r - mean) * (r - mean);
    const s = Math.sqrt(varSum / (rs.length - 1));

    w[sym] = !Number.isFinite(s) || s === 0 ? 1 / n : (1 / n) * Math.min(1, dailyTarget / s);
  }
  return w;
}
