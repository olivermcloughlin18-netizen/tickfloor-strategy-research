export const meta = {
  id: "sent-fear-greed-extreme-contrarian",
  name: "CNN-style extreme-fear buy / extreme-greed avoid (proxied by crypto Fear&Greed on QQQ)",
  family: "sentiment-altdata",
  source: "CNN Fear & Greed Index heuristic; catalogue names SPY (holdout) so proxied via QQQ per INDEX_PROXY rule, and only alternative.me FNG is available (no CNN feed in harness) so FNG substitutes for CNN's index",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ"],
  proxyFor: { SPY: "QQQ" },
  params: { entryLevel: 20, exitLevel: 50, maxHold: 60 },
};

export function signal(bars, i, ctx) {
  if (ctx.state.pos === undefined) ctx.state.pos = 0;
  if (ctx.state.daysHeld === undefined) ctx.state.daysHeld = 0;
  if (ctx.state.fearStreak === undefined) ctx.state.fearStreak = 0;

  const fng = ctx.fearGreed();
  if (fng !== null) {
    if (fng < ctx.params.entryLevel) ctx.state.fearStreak++;
    else ctx.state.fearStreak = 0;
  }

  if (ctx.state.pos === 1) {
    ctx.state.daysHeld++;
    const exitOnRecover = fng !== null && fng >= ctx.params.exitLevel;
    if (exitOnRecover || ctx.state.daysHeld >= ctx.params.maxHold) {
      ctx.state.pos = 0;
      ctx.state.daysHeld = 0;
    }
    return ctx.state.pos;
  }

  if (ctx.state.fearStreak >= 2) {
    ctx.state.pos = 1;
    ctx.state.daysHeld = 0;
    ctx.state.fearStreak = 0;
  }
  return ctx.state.pos;
}
