export const meta = {
  id: "s29-cx-funding-gated-breakout",
  name: "Funding-gated 20-day breakout (spot-led breakouts long, leveraged breakdowns short)",
  family: "trend",
  source: "Schmeling, Schrimpf & Todorov 2023 'Crypto carry' (BIS WP 1087); Kaiko/Glassnode desk notes on spot-led vs perp-led breakouts",
  assetClass: "crypto",
  timeframe: "1d",
  longShort: true,
  holdBars: 10,
  params: { channel: 20, longFundMax: 0.0001, shortFundMin: 0.0003, holdBars: 10 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (i < p.channel) return 0;
  const F = ctx.fundingRate(i);
  if (F === null || F === undefined) return 0;
  const c = bars[i].close;
  if (c > ctx.donchian(p.channel, i - 1).upper && F <= p.longFundMax) return 1;
  if (c < ctx.donchian(p.channel, i - 1).lower && F >= p.shortFundMin) return -1;
  return 0;
}
