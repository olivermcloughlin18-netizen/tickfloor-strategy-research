// VIX spike mean reversion (fear-spike buy). SPY is holdout -> proxy QQQ (INDEX_PROXY rule).
export const meta = {
  id: "sent-vix-term-structure-fear-spike",
  name: "VIX spike mean reversion (fear-spike buy)",
  family: "sentiment",
  source: "Whaley 2000, Journal of Portfolio Management",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ"],
  proxyFor: { SPY: "QQQ" },
  params: { smaWindow: 20, spikeMult: 1.5, absThresh: 30, maxHold: 20 },
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
    const heldBars = i - ctx.state.entryBar;
    if (vix < sma || heldBars >= p.maxHold) {
      ctx.state.pos = 0;
      ctx.state.entryBar = -1;
    }
    return ctx.state.pos;
  }

  if (vix > p.spikeMult * sma && vix > p.absThresh) {
    ctx.state.pos = 1;
    ctx.state.entryBar = i;
  }
  return ctx.state.pos;
}
