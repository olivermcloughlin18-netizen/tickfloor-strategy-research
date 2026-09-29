export const meta = {
  id: "s29-us-mcclellan",
  name: "McClellan oscillator on the 40-stock breadth",
  family: "trend",
  source: "McClellan & McClellan 1970s ('Patterns for Profit'; McClellan Oscillator)",
  assetClass: "us_stock",
  timeframe: "1d",
  assets: ["AAPL", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "V", "UNH", "XOM", "JNJ", "COST", "ABBV", "MRK", "AVGO", "CVX", "WMT", "BAC", "ORCL", "ADBE", "CRM", "NFLX", "AMD", "INTC", "ABT", "MCD", "DIS", "QCOM", "TXN", "HON", "CAT", "LOW", "SBUX", "BA", "UPS", "PFE", "T", "MDT", "UNP", "MMM"],
  rebalance: "daily",
  longShort: false,
  params: { fast: 19, slow: 39 },
};

export function rank(universe, t, ctx) {
  const eligible = [];
  let netAdvances = 0;

  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    const i = bars.length - 1;
    if (i < ctx.params.slow) continue;

    const dailyReturn = bars[i].close / bars[i - 1].close - 1;
    const nReturn = bars[i].close / bars[i - ctx.params.slow].close - 1;
    if (!Number.isFinite(dailyReturn) || !Number.isFinite(nReturn)) continue;

    eligible.push(sym);
    if (dailyReturn > 0) netAdvances++;
    else if (dailyReturn < 0) netAdvances--;
  }

  if (ctx.state.days === undefined) {
    ctx.state.days = 0;
    ctx.state.e19 = netAdvances;
    ctx.state.e39 = netAdvances;
  } else {
    ctx.state.e19 += 0.10 * (netAdvances - ctx.state.e19);
    ctx.state.e39 += 0.05 * (netAdvances - ctx.state.e39);
  }
  ctx.state.days++;

  if (ctx.state.days < ctx.params.slow || ctx.state.e19 <= ctx.state.e39 || eligible.length === 0) return {};

  const weights = {};
  const weight = 1 / eligible.length;
  for (const sym of eligible) weights[sym] = weight;
  return weights;
}
