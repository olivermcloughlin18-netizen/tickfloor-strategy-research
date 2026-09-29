export const meta = {
  id: "s29-cx-ath-breakout",
  name: "All-time-high breakout with a 15% trailing exit",
  family: "trend",
  source: "Li & Yu 2012 JFE ('Investor attention, psychological anchors': nearness to the historical high predicts returns); George & Hwang 2004",
  assetClass: "crypto",
  timeframe: "1d",
  assets: [
    "BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT",
    "LINKUSDT", "TRXUSDT", "BCHUSDT", "ATOMUSDT", "ETCUSDT", "DASHUSDT",
    "ZECUSDT", "AVAXUSDT", "UNIUSDT", "NEARUSDT", "AAVEUSDT", "HBARUSDT",
  ],
  longShort: false,
  params: { minHistory: 365, trail: 0.15 },
};

export function signal(bars, i, ctx) {
  const close = bars[i].close;
  if (ctx.state.position === undefined) {
    ctx.state.position = 0;
    ctx.state.high = close;
    ctx.state.peak = close;
    return 0;
  }

  const priorHigh = ctx.state.high;
  if (i >= ctx.params.minHistory) {
    if (ctx.state.position === 0 && close > priorHigh) {
      ctx.state.position = 1;
      ctx.state.peak = close;
    } else if (ctx.state.position === 1) {
      ctx.state.peak = Math.max(ctx.state.peak, close);
      if (close < (1 - ctx.params.trail) * ctx.state.peak) ctx.state.position = 0;
    }
  }

  ctx.state.high = Math.max(priorHigh, close);
  return ctx.state.position;
}
