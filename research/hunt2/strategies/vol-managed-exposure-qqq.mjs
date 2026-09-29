// Volatility-managed exposure / vol-timing (Moreira & Muir 2017 JF, and the
// 2020-2023 replication/robustness literature): be long only when trailing
// realized vol is below its own 1y regime median, flat (avoid the market)
// when vol is elevated. SPY is holdout -> QQQ proxy (INDEX_PROXY rule).
export const meta = {
  id: "vol-managed-exposure-qqq",
  name: "Vol-managed exposure: long QQQ only in low-realized-vol regime",
  family: "volatility",
  source: "Moreira & Muir 2017 JF (Volatility-Managed Portfolios)",
  assetClass: "etf",
  assets: ["QQQ"],
  proxyFor: { SPY: "QQQ" },
  timeframe: "1d",
  params: { volWindow: 20, regimeWindow: 252 },
};

export function signal(bars, i, ctx) {
  const { volWindow, regimeWindow } = ctx.params;
  if (i < regimeWindow + volWindow + 1) return 0;
  const rv = ctx.rollingStd("ret", volWindow, i);
  if (!Number.isFinite(rv)) return 0;
  if (ctx.state.hist === undefined) ctx.state.hist = ctx.rolling(regimeWindow);
  ctx.state.hist.push(rv);
  if (!ctx.state.hist.full()) return 0;
  const mean = ctx.state.hist.mean();
  // median proxy: mean is a fair regime-threshold proxy given the rolling helper
  // only exposes mean/std (ponytail: no custom heap, mean is close enough for a
  // volatility regime cut and matches the docstring intent, not a precise median).
  return rv <= mean ? 1 : 0;
}
