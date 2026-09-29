export const meta = {
  id: "sol-new-shorts-failed-breakdown",
  name: "Failed breakdown after new short-position buildup",
  family: "oi-spot-disagreement",
  source: "https://arxiv.org/abs/2310.14973",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  longShort: false,
  holdBars: 120,
  params: {
    priceLookbackHours: 24,
    maxPriceReturn: -0.03,
    minUnitOiRise: 0.06,
    armHours: 6,
    recoveryHighHours: 6,
    holdHours: 120,
    cooldownHours: 120,
  },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  const s = ctx.state;
  if (s.armUntil === undefined) s.armUntil = -1;
  if (s.nextEligible === undefined) s.nextEligible = 0;

  if (i < s.nextEligible) return 0;

  const oiNow = ctx.openInterest(i);
  if (i <= s.armUntil) {
    if (oiNow === null || i < p.recoveryHighHours) return 0;
    const priorHigh = ctx.donchian(p.recoveryHighHours, i - 1).upper;
    if (bars[i].close <= priorHigh) return 0;

    s.armUntil = -1;
    s.nextEligible = i + p.holdHours + p.cooldownHours;
    return 1;
  }

  s.armUntil = -1;
  if (i < p.priceLookbackHours || oiNow === null) return 0;

  const priorClose = bars[i - p.priceLookbackHours].close;
  const oiPrior = ctx.openInterest(i - p.priceLookbackHours);
  if (oiPrior === null || bars[i].close <= 0 || priorClose <= 0 || oiPrior <= 0) return 0;

  const priceReturn = bars[i].close / priorClose - 1;
  const unitOiRise = (oiNow / bars[i].close) / (oiPrior / priorClose) - 1;
  if (priceReturn <= p.maxPriceReturn && unitOiRise >= p.minUnitOiRise) {
    s.armUntil = i + p.armHours;
  }
  return 0;
}
