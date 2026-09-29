// Gary Antonacci GEM dual momentum. SPY/EFA are holdout -> proxy QQQ/DIA (INDEX_PROXY rule).
// No T-bill/risk-free series exists in ctx.macro, so "SPY vs T-bill" is proxied by
// "SPY(QQQ) 12m return > 0" (T-bill return is ~0 relative to equity swings at monthly granularity);
// AGG (real bond ETF) is held when that absolute-momentum test fails.
export const meta = {
  id: "equity-factors-dual-momentum-gem",
  name: "GEM dual momentum (SPY/EFA/AGG, QQQ/DIA proxy)",
  family: "equity-factors",
  source: "Antonacci, Dual Momentum Investing (2014)",
  assetClass: "etf",
  timeframe: "1d",
  universe: "ETFS_DAILY",
  rebalance: "monthly",
  proxyFor: { SPY: "QQQ", EFA: "DIA" },
  params: { lookbackMonths: 12 },
};

export function rank(universe, t, ctx) {
  const n = ctx.params.lookbackMonths;
  const syms = { us: "QQQ", intl: "DIA", bond: "AGG" };
  const rets = {};
  for (const key of Object.keys(syms)) {
    const bars = universe[syms[key]];
    if (!bars || bars.length < 30) return {};
    const monthly = ctx.resample(bars, "1M").filter((m) => m.complete);
    if (monthly.length < n) return {};
    const last = monthly.length - 1;
    rets[key] = monthly[last].close / monthly[last - n + 1].open - 1;
  }
  if (rets.us > 0) {
    return rets.us > rets.intl ? { QQQ: 1 } : { DIA: 1 };
  }
  return { AGG: 1 };
}
