// VIX term structure (VIX3M-VIX) as an equity timing regime filter.
// SPY is holdout -> proxy QQQ (INDEX_PROXY rule).
export const meta = {
  id: "vol-term-structure-contango-timer-spy",
  name: "VIX futures contango/backwardation SPY timing",
  family: "volatility",
  source: "CBOE; various QuantConnect community backtests of VIX contango timing",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ"],
  proxyFor: { SPY: "QQQ" },
  longShort: true,
  params: { contangoThreshold: 1.5 },
};

export function signal(bars, i, ctx) {
  const vix = ctx.macro("VIX", i);
  const vix3m = ctx.macro("VIX3M", i);
  if (ctx.state.pos === undefined) ctx.state.pos = 0;
  if (vix === null || vix3m === null) return ctx.state.pos;

  const spread = vix3m - vix;
  if (spread > ctx.params.contangoThreshold) {
    ctx.state.pos = 1;
  } else if (spread < 0) {
    ctx.state.pos = -1;
  } else {
    ctx.state.pos = 0;
  }
  return ctx.state.pos;
}
