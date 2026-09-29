// Source: FRED T10YIE 10y breakeven inflation. SPY is holdout -> proxy QQQ (INDEX_PROXY rule).
export const meta = {
  id: "wide-macro-tips-breakeven-inflation-real-yield-regime__rob2",
  name: "10Y TIPS breakeven inflation rate regime for equity/gold allocation (rob2: threshold-25%) (wide US stocks)",
  family: "macro-intermarket",
  source: "Bridgewater All Weather growth-inflation quadrant framework; FRED T10YIE",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  rebalance: "weekly",
  params: { lookbackDays: 60, thresholdPp: 0.225 },
};

const DAY = 86400;

export function rank(universe, t, ctx) {
  const v = ctx.macro("T10YIE");
  if (ctx.state.hist === undefined) ctx.state.hist = [];
  const hist = ctx.state.hist;
  if (v !== null) hist.push({ t, v });

  if (v === null) return {};
  const targetT = t - ctx.params.lookbackDays * DAY;
  let past = null;
  for (let k = hist.length - 1; k >= 0; k--) {
    if (hist[k].t <= targetT) { past = hist[k].v; break; }
  }
  if (past === null) return {}; // not enough history yet

  const change = v - past;
  const hasQQQ = !!universe.QQQ;
  const hasGLD = !!universe.GLD;
  if (!hasQQQ) return {};

  if (change > ctx.params.thresholdPp) {
    // rising inflation expectations fast: 50% equity, 50% gold
    return hasGLD ? { QQQ: 0.5, GLD: 0.5 } : { QQQ: 1 };
  }
  return { QQQ: 1 };
}
