export const meta = {
  id: "s29-us-stoploss-momentum",
  name: "12-1 momentum with a 10% per-name stop-loss",
  family: "momentum",
  source: "Han, Zhou & Zhu 2016 JFE ('Taming momentum crashes: a simple stop-loss strategy')",
  assetClass: "us_stock",
  timeframe: "1d",
  assets: [
    "AAPL", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "V", "UNH", "XOM",
    "JNJ", "COST", "ABBV", "MRK", "AVGO", "CVX", "WMT", "BAC", "ORCL", "ADBE",
    "CRM", "NFLX", "AMD", "INTC", "ABT", "MCD", "DIS", "QCOM", "TXN", "HON",
    "CAT", "LOW", "SBUX", "BA", "UPS", "PFE", "T", "MDT", "UNP", "MMM",
  ],
  longShort: false,
  rebalance: "daily",
  params: { top: 8, stop: 0.1 },
};

export function rank(universe, t, ctx) {
  const state = ctx.state;
  if (state.month === undefined) {
    state.month = -1;
    state.selected = [];
    state.entry = {};
    state.stopped = {};
  }

  const date = new Date(t * 1000);
  const month = date.getUTCFullYear() * 12 + date.getUTCMonth();
  if (month !== state.month) {
    const scores = [];
    for (const sym of Object.keys(universe)) {
      const bars = universe[sym];
      if (bars.length < 253) continue;
      scores.push([sym, bars[bars.length - 22].close / bars[bars.length - 253].close - 1]);
    }
    scores.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    state.month = month;
    state.selected = scores.slice(0, ctx.params.top).map(([sym]) => sym);
    state.entry = {};
    state.stopped = {};
    for (const sym of state.selected) state.entry[sym] = universe[sym][universe[sym].length - 1].close;
  }

  const weights = {};
  for (const sym of state.selected) {
    const bars = universe[sym];
    if (!bars) continue;
    if (bars[bars.length - 1].close <= (1 - ctx.params.stop) * state.entry[sym]) state.stopped[sym] = true;
    if (!state.stopped[sym]) weights[sym] = 1 / ctx.params.top;
  }
  return weights;
}
