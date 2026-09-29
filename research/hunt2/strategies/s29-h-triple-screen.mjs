export const meta = {
  id: "s29-h-triple-screen",
  name: "Elder triple screen: 50-day uptrend, hourly RSI pullback",
  family: "trend",
  source: "Elder 1993 'Trading for a Living' (Triple Screen system)",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","LTCUSDT","LINKUSDT","TRXUSDT"],
  params: { trendBars: 1200, slopeLag: 24, rsi: 14, entry: 30, exit: 55, maxHold: 24 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  const s = ctx.state;
  if (s.held === undefined) s.held = -1;
  if (i < p.trendBars + p.slopeLag) return 0;
  const r = ctx.rsi(p.rsi, i);
  if (s.held >= 0) {
    s.held++;
    if (r > p.exit || s.held >= p.maxHold) { s.held = -1; return 0; }
    return 1;
  }
  const T = ctx.sma("close", p.trendBars, i), T0 = ctx.sma("close", p.trendBars, i - p.slopeLag);
  if (bars[i].close > T && T > T0 && r < p.entry) { s.held = 0; return 1; }
  return 0;
}
