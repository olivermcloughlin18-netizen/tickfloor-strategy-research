export const meta = {
  id: "s29-us-updown-volume",
  name: "13-week up/down volume ratio leaders",
  family: "momentum",
  source: "Investor's Business Daily Up/Down Volume Ratio and Accumulation/Distribution rating (O'Neil)",
  assetClass: "us_stock",
  timeframe: "1d",
  assets: ["AAPL","NVDA","AMZN","GOOGL","META","TSLA","JPM","V","UNH","XOM","JNJ","COST","ABBV","MRK","AVGO","CVX","WMT","BAC","ORCL","ADBE","CRM","NFLX","AMD","INTC","ABT","MCD","DIS","QCOM","TXN","HON","CAT","LOW","SBUX","BA","UPS","PFE","T","MDT","UNP","MMM"],
  rebalance: "weekly",
  longShort: false,
  params: { window: 63, top: 8 },
};

export function rank(universe, t, ctx) {
  const scores = [];
  const n = ctx.params.window;

  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    if (bars.length < n + 1) continue;

    let upVolume = 0;
    let downVolume = 0;
    let downDays = 0;
    for (let i = bars.length - n; i < bars.length; i++) {
      const r = bars[i].close / bars[i - 1].close - 1;
      if (r > 0) upVolume += bars[i].volume;
      else if (r < 0) {
        downVolume += bars[i].volume;
        downDays++;
      }
    }
    if (downDays === 0) continue;
    scores.push([sym, upVolume / downVolume]);
  }

  scores.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const weights = {};
  for (const [sym] of scores.slice(0, ctx.params.top)) weights[sym] = 1 / ctx.params.top;
  return weights;
}
