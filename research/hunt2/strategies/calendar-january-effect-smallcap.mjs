// Rozeff & Kinney 1976; Keim 1983 — small-cap January effect.
// IWM is holdout; INDEX_PROXY rule -> trade QQQ instead of IWM.
export const meta = {
  id: "calendar-january-effect-smallcap",
  name: "January effect (small-cap outperformance) - QQQ proxy",
  family: "seasonality",
  source: "Rozeff & Kinney 1976 J. Financial Economics; Keim 1983 J. Financial Economics",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ"],
  proxyFor: { IWM: "QQQ" },
  params: {},
};

// Long for the first 5 trading days of each January, flat rest of year.
export function signal(bars, i, ctx) {
  if (ctx.state.year === undefined) { ctx.state.year = null; ctx.state.count = 0; }
  const d = new Date(bars[i].time * 1000);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0 = January
  if (m !== 0) { ctx.state.year = y; ctx.state.count = 0; return 0; }
  if (ctx.state.year !== y) { ctx.state.year = y; ctx.state.count = 0; }
  ctx.state.count++;
  return ctx.state.count <= 5 ? 1 : 0;
}
