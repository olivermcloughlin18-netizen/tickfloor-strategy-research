// Dollar strength inverse signal for risk assets. Rule cites SPY/BTC; SPY holdout -> QQQ proxy.
// Single assetClass per file, so this file tests the equity leg (QQQ). DTWEXBGS is weekly (D+7 lag).
export const meta = {
  id: "wide-macro-dxy-strength-risk-asset-inverse",
  name: "USD broad index 50d ROC inverse signal on risk assets (wide US stocks)",
  family: "macro-intermarket",
  source: "FRED DTWEXBGS (Fed H.10 broad dollar index); dollar-smile / risk-asset inverse-dollar folklore",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  params: { lookbackDays: 50, thresholdPct: 2 },
};

const DAY = 86400;

export function signal(bars, i, ctx) {
  const dxy = ctx.macro("DTWEXBGS", i);
  if (ctx.state.hist === undefined) ctx.state.hist = [];
  if (ctx.state.pos === undefined) ctx.state.pos = 1; // default long until first signal

  if (dxy !== null) ctx.state.hist.push({ t: bars[i].time, v: dxy });
  if (dxy === null) return ctx.state.pos;

  const targetT = bars[i].time - ctx.params.lookbackDays * DAY;
  const hist = ctx.state.hist;
  let past = null;
  for (let k = hist.length - 1; k >= 0; k--) {
    if (hist[k].t <= targetT) { past = hist[k].v; break; }
  }
  if (past === null) return ctx.state.pos;

  const rocPct = (dxy / past - 1) * 100;
  if (rocPct <= -ctx.params.thresholdPct) ctx.state.pos = 1;      // dollar weakening: risk-on
  else if (rocPct >= ctx.params.thresholdPct) ctx.state.pos = 0;  // dollar strengthening: flat

  return ctx.state.pos;
}
