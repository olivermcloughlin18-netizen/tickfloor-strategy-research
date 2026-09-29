// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "r27-cx-tsmom28-fngfear__rob1",
  name: "Crypto 4-week momentum plus a 90-day extreme-fear override (-25%)",
  family: "sentiment",
  source: "u/Corey_Blake, r/CryptoMarkets 1wp3tyi ('11 episodes of F&G <=10 since 2018, 8 of 8 green 90 days later'; his signal held up in the drop-best-run check); Baker & Wurgler 2006 JF",
  assetClass: "crypto",
  timeframe: "1d",
  // universe: all 18 CRYPTO_DAILY coins (default; no `assets` override)
  params: { lookback: 21, fearLevel: 10, fearDays: 90 },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state starts as {} (always truthy): initialise fields with `if (ctx.state.x === undefined)`.
// bar.time is epoch SECONDS (bar open). ctx.params is meta.params.
export function signal(bars, i, ctx) {
  const lookback = ctx.params.lookback;
  const fearLevel = ctx.params.fearLevel;
  const fearDays = ctx.params.fearDays;

  if (ctx.state.lastFear === undefined) ctx.state.lastFear = undefined;

  const f = ctx.fearGreed();
  if (f !== null && f <= fearLevel) ctx.state.lastFear = i;

  const fear = ctx.state.lastFear !== undefined && i - ctx.state.lastFear <= fearDays - 1;
  const trend = i < lookback ? true : bars[i].close > bars[i - lookback].close;

  return (trend || fear) ? 1 : 0;
}
