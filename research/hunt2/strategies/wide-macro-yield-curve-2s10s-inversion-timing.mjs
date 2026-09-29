// 2s10s yield curve inversion/re-steepening equity timing.
// SPY named in spec (holdout) -> INDEX_PROXY rule: trade QQQ instead.
export const meta = {
  id: "wide-macro-yield-curve-2s10s-inversion-timing",
  name: "2s10s yield curve inversion/re-steepening equity timing (wide US stocks)",
  family: "other",
  source: "FRED T10Y2Y; Estrella-Mishkin NY Fed 1996; Campbell Harvey inverted yield curve papers",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  params: { revertDays: 90 },
};

export function signal(bars, i, ctx) {
  const spread = ctx.macro("T10Y2Y", i);
  if (ctx.state.pos === undefined) ctx.state.pos = 1;   // default long
  if (ctx.state.invertedDays === undefined) ctx.state.invertedDays = 0;
  if (ctx.state.prevSpread === undefined) ctx.state.prevSpread = null;

  if (spread === null) return ctx.state.pos;

  const prev = ctx.state.prevSpread;

  // crossed into inversion
  if (prev !== null && prev >= 0 && spread < 0) {
    ctx.state.pos = 0;
    ctx.state.invertedDays = 0;
  } else if (spread < 0) {
    ctx.state.invertedDays += 1;
  }

  // re-steepening: crossed back above 0
  if (prev !== null && prev < 0 && spread >= 0) {
    ctx.state.pos = 1;
    ctx.state.invertedDays = 0;
  }

  // inversion persisted 90+ trading days -> revert to long regardless
  if (ctx.state.pos === 0 && ctx.state.invertedDays >= ctx.params.revertDays) {
    ctx.state.pos = 1;
  }

  ctx.state.prevSpread = spread;
  return ctx.state.pos;
}
