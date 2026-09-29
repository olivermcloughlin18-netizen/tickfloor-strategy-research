export const meta = {
  id: "s29-us-daytime-reversal",
  name: "Frequency of positive daytime reversals",
  family: "other",
  source: "Akbas, Boehmer, Jiang & Koch 2022 JFE ('Overnight returns, daytime reversals, and future stock returns')",
  assetClass: "us_stock",
  timeframe: "1d",
  assets: ["AAPL","NVDA","AMZN","GOOGL","META","TSLA","JPM","V","UNH","XOM","JNJ","COST","ABBV","MRK","AVGO","CVX","WMT","BAC","ORCL","ADBE","CRM","NFLX","AMD","INTC","ABT","MCD","DIS","QCOM","TXN","HON","CAT","LOW","SBUX","BA","UPS","PFE","T","MDT","UNP","MMM"],
  rebalance: "monthly",
  longShort: false,
  params: { window: 21, top: 8 },
};

export function rank(universe, t, ctx) {
  const { window, top } = ctx.params;
  const scores = [];

  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    if (bars.length < window + 1) continue;

    let score = 0;
    for (let k = bars.length - window; k < bars.length; k++) {
      const overnight = bars[k].open / bars[k - 1].close - 1;
      const daytime = bars[k].close / bars[k].open - 1;
      if (overnight > 0 && daytime < 0) score++;
      else if (overnight < 0 && daytime > 0) score--;
    }
    scores.push([sym, score]);
  }

  scores.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const weights = {};
  for (const [sym] of scores.slice(0, top)) weights[sym] = 1 / top;
  return weights;
}
