// Faber GTAA 10-month SMA timing, 5 sleeves. SPY->QQQ, EFA->DIA proxy (both holdout).
export const meta = {
  id: "wide-trend-faber-10m-sma-gtaa",
  name: "Faber GTAA 10-month SMA timing across 5 asset classes (wide US stocks)",
  family: "trend",
  source: "Faber 2007 SSRN 962461",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",

  params: { smaMonths: 10 },
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
