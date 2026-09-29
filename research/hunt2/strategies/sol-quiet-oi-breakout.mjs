export const meta = {
  id: "sol-quiet-oi-breakout",
  name: "Quiet spot price with leveraged-position buildup before breakout",
  family: "oi-spot-disagreement",
  source: "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4218907",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  longShort: false,
  holdBars: 120,
  params: {
    oiLookbackHours: 48,
    minUnitOiRise: 0.08,
    maxAbsPriceMove: 0.02,
    breakoutLookbackHours: 12,
    holdHours: 120,
    cooldownHours: 120,
  },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.nextEligible === undefined) ctx.state.nextEligible = 0;
  if (i < ctx.state.nextEligible || i < p.oiLookbackHours) return 0;

  const oiNow = ctx.openInterest(i);
  const oiPast = ctx.openInterest(i - p.oiLookbackHours);
  const closeNow = bars[i].close;
  const closePast = bars[i - p.oiLookbackHours].close;
  if (oiNow === null || oiPast === null || closeNow <= 0 || closePast <= 0) return 0;

  const unitOiRise = (oiNow / closeNow) / (oiPast / closePast) - 1;
  const priceMove = closeNow / closePast - 1;
  const priorHigh = ctx.donchian(p.breakoutLookbackHours, i - 1).upper;
  if (unitOiRise < p.minUnitOiRise || Math.abs(priceMove) >= p.maxAbsPriceMove || closeNow <= priorHigh) return 0;

  ctx.state.nextEligible = i + p.holdHours + p.cooldownHours;
  return 1;
}
