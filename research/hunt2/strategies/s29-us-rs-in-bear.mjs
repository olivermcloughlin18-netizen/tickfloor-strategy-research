export const meta = {
  id: "s29-us-rs-in-bear",
  name: "Hold only self-trending stocks when the index is below its 200-day average",
  family: "trend",
  source: "O'Neil 1988 (leaders resist bear markets); Moskowitz, Ooi & Pedersen 2012 (time-series trend at the name level)",
  assetClass: "us_stock",
  timeframe: "1d",
  assets: ["AAPL", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "V", "UNH", "XOM", "JNJ", "COST", "ABBV", "MRK", "AVGO", "CVX", "WMT", "BAC", "ORCL", "ADBE", "CRM", "NFLX", "AMD", "INTC", "ABT", "MCD", "DIS", "QCOM", "TXN", "HON", "CAT", "LOW", "SBUX", "BA", "UPS", "PFE", "T", "MDT", "UNP", "MMM"],
  rebalance: "weekly",
  longShort: false,
  params: { sma: 200 },
};

export function rank(universe, t, ctx) {
  const returnsByDay = {};
  const eligible = [];
  const trending = [];

  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    const n = bars.length;

    for (let i = 1; i < n; i++) {
      const day = bars[i].time;
      if (returnsByDay[day] === undefined) returnsByDay[day] = [0, 0];
      returnsByDay[day][0] += bars[i].close / bars[i - 1].close - 1;
      returnsByDay[day][1]++;
    }

    if (n < ctx.params.sma) continue;
    eligible.push(sym);
    let sum = 0;
    for (let i = n - ctx.params.sma; i < n; i++) sum += bars[i].close;
    if (bars[n - 1].close > sum / ctx.params.sma) trending.push(sym);
  }

  const days = Object.keys(returnsByDay).map(Number).sort((a, b) => a - b);
  if (days.length < 400 || !eligible.length) return {};

  let index = 1;
  const levels = [];
  for (const day of days.slice(-400)) {
    const [sum, count] = returnsByDay[day];
    index *= 1 + sum / count;
    levels.push(index);
  }

  let indexMean = 0;
  for (let i = levels.length - ctx.params.sma; i < levels.length; i++) indexMean += levels[i];
  indexMean /= ctx.params.sma;

  const selected = index < indexMean ? trending : eligible;
  if (!selected.length) return {};
  const weights = {};
  for (const sym of selected) weights[sym] = 1 / selected.length;
  return weights;
}
