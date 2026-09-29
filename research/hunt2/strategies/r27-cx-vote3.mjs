// Majority vote of 3 trend indicators: momentum vs lookback close, close vs SMA, RSI vs 50.
// Long-only. Each sub-signal defaults to "true" (long) during its own warm-up, matching
// buy-and-hold during warm-up as specified.
//
// u/Stitch426, r/Daytrading 1wnw9xf ("not using the best combo of indicators");
// Neely, Rapach, Tu & Zhou 2014 Management Science (combining technical indicators)

export const meta = {
  id: "r27-cx-vote3",
  name: "Crypto 2-of-3 indicator agreement (momentum, 50-day average, RSI)",
  family: "trend",
  source: "u/Stitch426, r/Daytrading 1wnw9xf ('not using the best combo of indicators'); Neely, Rapach, Tu & Zhou 2014 Management Science (combining technical indicators)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  params: { momLookback: 28, smaWindow: 50, rsiWindow: 14 },
};

export function signal(bars, i, ctx) {
  const { momLookback, smaWindow, rsiWindow } = ctx.params;
  const close = bars[i].close;

  const A = i < momLookback ? true : close > bars[i - momLookback].close;

  const s = ctx.sma("close", smaWindow, i);
  const B = Number.isFinite(s) ? close > s : true;

  const x = ctx.rsi(rsiWindow, i);
  const C = Number.isFinite(x) ? x > 50 : true;

  const votes = (A ? 1 : 0) + (B ? 1 : 0) + (C ? 1 : 0);
  return votes >= 2 ? 1 : 0;
}
