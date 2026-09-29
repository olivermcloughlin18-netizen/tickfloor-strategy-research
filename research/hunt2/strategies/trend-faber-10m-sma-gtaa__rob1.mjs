// Faber GTAA 10-month SMA timing, 5 sleeves. SPY->QQQ, EFA->DIA proxy (both holdout).
export const meta = {
  id: "trend-faber-10m-sma-gtaa__rob1",
  name: "Faber GTAA 10-month SMA timing across 5 asset classes",
  family: "trend",
  source: "Faber 2007 SSRN 962461",
  assetClass: "etf",
  timeframe: "1d",
  universe: "ETFS_DAILY",
  rebalance: "monthly",
  proxyFor: { SPY: "QQQ", EFA: "DIA" },
  params: { smaMonths: 8 },
};

export function rank(universe, t, ctx) {
  const syms = ["QQQ", "DIA", "IEF", "VNQ", "GLD"];
  const n = ctx.params.smaMonths;
  const w = {};
  for (const sym of syms) {
    const bars = universe[sym];
    if (!bars || bars.length < 30) continue;
    const monthly = ctx.resample(bars, "1M").filter((m) => m.complete);
    if (monthly.length < n) continue;
    const last = monthly.length - 1;
    const price = monthly[last].close;
    let sum = 0;
    for (let k = last - n + 1; k <= last; k++) sum += monthly[k].close;
    const sma = sum / n;
    if (price > sma) w[sym] = 1 / syms.length;
  }
  return w;
}
