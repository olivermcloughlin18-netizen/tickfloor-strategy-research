// VIX spike (>50% above its own 10-day SMA) mean reversion into equities.
// SPY is holdout -> proxy QQQ (INDEX_PROXY rule).
export const meta = {
  id: "wide-vol-vix-mean-reversion-spike",
  name: "VIX spike mean-reversion into SPY (wide US stocks)",
  family: "volatility",
  source: "Simon & Wiggins 2001 J. Futures Markets; CBOE VIX spike studies",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  params: { smaWindow: 10, spikeMult: 1.5, maxHold: 10 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.win === undefined) ctx.state.win = ctx.rolling(p.smaWindow);
  if (ctx.state.pos === undefined) ctx.state.pos = 0;
  if (ctx.state.entryBar === undefined) ctx.state.entryBar = -1;

  const vix = ctx.macro("VIX", i);
  if (vix === null) return ctx.state.pos;
  ctx.state.win.push(vix);
  if (!ctx.state.win.full()) return 0;
  const sma = ctx.state.win.mean();

  if (ctx.state.pos === 1) {
    const held = i - ctx.state.entryBar;
    if (vix < sma || held >= p.maxHold) {
      ctx.state.pos = 0;
      ctx.state.entryBar = -1;
    }
    return ctx.state.pos;
  }

  if (vix > p.spikeMult * sma) {
    ctx.state.pos = 1;
    ctx.state.entryBar = i;
  }
  return ctx.state.pos;
}
