export const meta = {
  id: "social-ta-williams-r-reversal",
  name: "Williams %R overbought/oversold reversal",
  family: "mean_reversion",
  source: "r/Daytrading and TikTok Williams %R strategy posts",
  assetClass: "crypto",
  timeframe: "1d",
  longShort: true,
  params: { window: 14 },
};

export function signal(bars, i, ctx) {
  if (i + 1 < 14) return 0;

  // Calculate Williams %R
  let h = bars[i].high;
  let l = bars[i].low;
  for (let k = i - 13; k <= i; k++) {
    if (bars[k].high > h) h = bars[k].high;
    if (bars[k].low < l) l = bars[k].low;
  }
  const wr = (h - l) === 0 ? 0 : -100 * (h - bars[i].close) / (h - l);

  // Initialize state
  if (!ctx.state) {
    ctx.state = { pos: 0, cnt: 0, last: 0 };
  }

  const last = ctx.state.last;
  const cnt = ctx.state.cnt;
  const pos = ctx.state.pos;

  // Exit logic for long
  if (pos === 1) {
    ctx.state.cnt = cnt + 1;
    if (ctx.state.cnt >= 10 || (last <= -20 && wr > -20)) {
      ctx.state.pos = 0;
      ctx.state.cnt = 0;
      ctx.state.last = wr;
      return 0;
    }
    ctx.state.last = wr;
    return 1;
  }

  // Exit logic for short
  if (pos === -1) {
    ctx.state.cnt = cnt + 1;
    if (ctx.state.cnt >= 10 || (last > -80 && wr <= -80)) {
      ctx.state.pos = 0;
      ctx.state.cnt = 0;
      ctx.state.last = wr;
      return 0;
    }
    ctx.state.last = wr;
    return -1;
  }

  // Entry logic for long
  if (last <= -80 && wr > -80) {
    ctx.state.pos = 1;
    ctx.state.cnt = 1;
    ctx.state.last = wr;
    return 1;
  }

  // Entry logic for short
  if (last > -20 && wr <= -20) {
    ctx.state.pos = -1;
    ctx.state.cnt = 1;
    ctx.state.last = wr;
    return -1;
  }

  // Flat
  ctx.state.last = wr;
  return 0;
}
