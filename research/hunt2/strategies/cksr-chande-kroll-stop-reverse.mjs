// CKSR = Chande Kroll Stop, used stop-and-reverse.
// Chande & Kroll, "The New Technical Trader" (1994); TradingView built-in defaults p=10, x=1, q=9.
//
//   firstHighStop(k) = highestHigh(p, k) - x * ATR(p, k)
//   firstLowStop(k)  = lowestLow(p, k)  + x * ATR(p, k)
//   stopShort(k)     = max of firstHighStop over the last q bars
//   stopLong(k)      = min of firstLowStop  over the last q bars
//
// Signal, evaluated on bar i-1 and emitted for bar i (always in the market once warm):
//   close[i-1] > stopShort(i-1) -> +1 ; close[i-1] < stopLong(i-1) -> -1 ; else unchanged.

export const meta = {
  id: "cksr-chande-kroll-stop-reverse",
  name: "Chande Kroll Stop (10/1/9) used stop-and-reverse",
  family: "trend",
  source: "Chande & Kroll, The New Technical Trader (1994); TradingView built-in 'Chande Kroll Stop' defaults p=10 x=1 q=9",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  longShort: true,
  params: { p: 10, x: 1.0, q: 9 },
};

export function signal(bars, i, ctx) {
  const { p, x, q } = ctx.params;
  if (ctx.state.pos === undefined) {
    ctx.state.pos = 0;
    ctx.state.hs = [];   // firstHighStop, most recent last
    ctx.state.ls = [];   // firstLowStop,  most recent last
  }

  // Push bar i's first stops, keeping q+1 so that dropping the newest leaves
  // exactly the q bars ending at i-1.
  const d = ctx.donchian(p, i);
  const a = ctx.atr(p, i);
  const hs = ctx.state.hs, ls = ctx.state.ls;
  if (Number.isFinite(d.upper) && Number.isFinite(d.lower) && Number.isFinite(a)) {
    hs.push(d.upper - x * a);
    ls.push(d.lower + x * a);
  } else {
    hs.length = 0;
    ls.length = 0;
  }
  if (hs.length > q + 1) { hs.shift(); ls.shift(); }

  if (i < p + q) return 0;            // warm-up 10 + 9 = 19 bars
  if (hs.length < q + 1) return 0;

  // Windows covering bars i-q .. i-1 (drop the newest entry, which is bar i).
  let stopShort = -Infinity, stopLong = Infinity;
  for (let k = 0; k < q; k++) {
    if (hs[k] > stopShort) stopShort = hs[k];
    if (ls[k] < stopLong) stopLong = ls[k];
  }

  const c = bars[i - 1].close;
  if (c > stopShort) ctx.state.pos = 1;
  else if (c < stopLong) ctx.state.pos = -1;
  return ctx.state.pos;
}
