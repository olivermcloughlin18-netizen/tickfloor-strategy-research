// prereg-2026-09-27 dumb control for the crypto signal rows: the mirror of r27-cx-tsmom28.
// Long only while today's close is at or below the close 28 bars ago; warm-up (i < 28) holds long.
export const meta = {
  id: "r27-ctrl-cx-antitrend28",
  name: "Control: crypto held only in 4-week downtrends (mirror)",
  family: "deep-validation-control",
  source: "Preregistered matched naive control (prereg-2026-09-27 section 6)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  params: { lookback: 28 },
};

export function signal(bars, i, ctx) {
  const n = ctx.params.lookback;
  if (i < n) return 1;
  return bars[i].close <= bars[i - n].close ? 1 : 0;
}
