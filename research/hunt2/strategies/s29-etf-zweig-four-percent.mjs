export const meta = {
  id: "s29-etf-zweig-four-percent",
  name: "Zweig four-percent model on weekly closes",
  family: "trend",
  source: "Zweig 1986 'Winning on Wall Street' (Ned Davis / Zweig four-percent model)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "DIA", "XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "GLD", "TLT"],
  longShort: false,
  params: { pct: 0.04 },
};

export function signal(bars, i, ctx) {
  if (ctx.state.pos === undefined) {
    ctx.state.pos = 0;
    ctx.state.completeWeeks = 0;
    ctx.state.lo = Infinity;
  }

  const weeks = ctx.resample(bars, "1w").filter((week) => week.complete);
  if (weeks.length === ctx.state.completeWeeks) return ctx.state.pos;

  ctx.state.completeWeeks = weeks.length;
  const close = weeks[weeks.length - 1].close;

  if (ctx.state.pos === 0) {
    ctx.state.lo = Math.min(ctx.state.lo, close);
    if (weeks.length >= 4 && close >= (1 + ctx.params.pct) * ctx.state.lo) {
      ctx.state.pos = 1;
      ctx.state.hi = close;
    }
  } else {
    ctx.state.hi = Math.max(ctx.state.hi, close);
    if (close <= (1 - ctx.params.pct) * ctx.state.hi) {
      ctx.state.pos = 0;
      ctx.state.lo = close;
    }
  }

  return ctx.state.pos;
}
