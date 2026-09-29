export const meta = {
  id: "s29-us-arms-trin",
  name: "Arms index (TRIN) oversold buy on the 40-stock breadth",
  family: "sentiment",
  source: "Arms 1989 'The Arms Index (TRIN)'",
  assetClass: "us_stock",
  timeframe: "1d",
  assets: ["AAPL", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "V", "UNH", "XOM", "JNJ", "COST", "ABBV", "MRK", "AVGO", "CVX", "WMT", "BAC", "ORCL", "ADBE", "CRM", "NFLX", "AMD", "INTC", "ABT", "MCD", "DIS", "QCOM", "TXN", "HON", "CAT", "LOW", "SBUX", "BA", "UPS", "PFE", "T", "MDT", "UNP", "MMM"],
  rebalance: "daily",
  longShort: false,
  params: { window: 10, level: 1.2, holdDays: 10 },
};

export function rank(universe, t, ctx) {
  const { window, level, holdDays } = ctx.params;
  if (ctx.state.trin === undefined) {
    ctx.state.trin = [];
    ctx.state.counter = 0;
  }

  const eligible = [];
  let advances = 0;
  let declines = 0;
  let advanceVolume = 0;
  let declineVolume = 0;
  let returnSum = 0;

  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    const i = bars.length - 1;
    if (i < window) continue;

    const dailyReturn = bars[i].close / bars[i - 1].close - 1;
    const nReturn = bars[i].close / bars[i - window].close - 1;
    if (!Number.isFinite(dailyReturn) || !Number.isFinite(nReturn)) continue;

    eligible.push(sym);
    returnSum += dailyReturn;
    if (dailyReturn > 0) {
      advances++;
      advanceVolume += bars[i].volume;
    } else if (dailyReturn < 0) {
      declines++;
      declineVolume += bars[i].volume;
    }
  }

  const marketReturn = eligible.length ? returnSum / eligible.length : NaN;
  const trin = advances === 0 || declines === 0 || advanceVolume === 0 || declineVolume === 0
    ? 1
    : (advances / declines) / (advanceVolume / declineVolume);
  ctx.state.trin.push(trin);

  if (ctx.state.trin.length >= window) {
    let sum = 0;
    for (let i = ctx.state.trin.length - window; i < ctx.state.trin.length; i++) sum += ctx.state.trin[i];
    if (sum / window >= level) ctx.state.counter = holdDays;
  }

  if (ctx.state.counter <= 0 || !Number.isFinite(marketReturn)) return {};
  ctx.state.counter--;

  const weights = {};
  const weight = 1 / eligible.length;
  for (const sym of eligible) weights[sym] = weight;
  return weights;
}
