// MATCHED DUMB CONTROL for cksr-chande-kroll-stop-reverse.
// Identical shape: same universe, timeframe, costs, one-bar evaluation shift,
// always-in-market stop-and-reverse. The ATR offset and the q-bar smoothing are
// REMOVED. All that is left is a plain 18-bar Donchian channel flip.
// 18 = p + q - 1 = 10 + 9 - 1, CKSR's effective lookback. Chosen before running.

export const meta = {
  id: "cksr-control-donchian18-flip",
  name: "Matched control: plain 18-bar Donchian channel flip (stop-and-reverse)",
  family: "trend",
  source: "Matched naive control for the Chande Kroll Stop lane (hunt cksr-1, 2026-09-22). No ATR term, no q-smoothing.",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  longShort: true,
  params: { n: 18 },
};

export function signal(bars, i, ctx) {
  if (ctx.state.pos === undefined) ctx.state.pos = 0;
  const n = ctx.params.n;
  // Evaluate on bar i-1 against the n-bar channel of bars ending i-2 (prior high/low).
  if (i < n + 2) return 0;
  const d = ctx.donchian(n, i - 2);
  if (!Number.isFinite(d.upper) || !Number.isFinite(d.lower)) return 0;
  const c = bars[i - 1].close;
  if (c > d.upper) ctx.state.pos = 1;
  else if (c < d.lower) ctx.state.pos = -1;
  return ctx.state.pos;
}
