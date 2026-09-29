export const meta = {
  id: "s29-h-breakout-retest",
  name: "72-hour breakout, buy the first successful retest",
  family: "trend",
  source: "Edwards & Magee 'Technical Analysis of Stock Trends' (breakout pullback / throwback); Bulkowski 2005 (throwbacks)",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","LTCUSDT","LINKUSDT","TRXUSDT"],
  params: { channel: 72, window: 12, touch: 0.005, cancel: 0.02, holdBars: 24 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params, s = ctx.state;
  if (s.left === undefined) { s.left = 0; s.K = 0; s.b = -1; s.done = true; }
  if (i < p.channel) return 0;
  const bar = bars[i];
  // new breakout replaces any stored setup (checked every bar, even in a trade)
  const K = ctx.donchian(p.channel, i - 1).upper;
  if (bar.close > K) { s.K = K; s.b = i; s.done = false; return holdOrZero(s); }
  if (!s.done && i > s.b && i <= s.b + p.window) {
    if (bar.close < (1 - p.cancel) * s.K) s.done = true;
    else if (s.left === 0 && bar.low <= (1 + p.touch) * s.K && bar.close > s.K && bar.close > bars[i - 1].high) {
      s.done = true; s.left = p.holdBars;
    }
  } else if (i > s.b + p.window) s.done = true;
  return holdOrZero(s);
}
function holdOrZero(s) {
  if (s.left > 0) { s.left--; return 1; }
  return 0;
}
