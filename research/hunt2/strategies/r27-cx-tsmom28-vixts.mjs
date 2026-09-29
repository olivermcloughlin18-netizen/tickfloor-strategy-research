// Time-series momentum (28d) gated off by VIX term-structure stress on crypto.
// trend = close above its value 28 bars ago; stress = VIX/VIX3M >= 1.0 (backwardation).
// Long only when trending and not stressed.
// Source: Simon & Campasano 2014 J. Derivatives (VIX futures basis); Johnson 2017 JFQA
// (VIX term structure and risk premia); Adrian, Iyer & Qureshi 2022 IMF (crypto moves
// with equities since 2020).
export const meta = {
  id: "r27-cx-tsmom28-vixts",
  name: "Crypto 4-week momentum, flat when the VIX curve is inverted",
  family: "volatility",
  source: "Simon & Campasano 2014 J. Derivatives (VIX futures basis); Johnson 2017 JFQA (VIX term structure and risk premia); Adrian, Iyer & Qureshi 2022 IMF (crypto moves with equities since 2020)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  params: { lookback: 28, ratioMax: 1.0 },
};

export function signal(bars, i, ctx) {
  const n = ctx.params.lookback;
  const v = ctx.macro("VIX");
  const v3 = ctx.macro("VIX3M");
  const stress = (v !== null && v3 !== null && v3 > 0) ? (v / v3 >= ctx.params.ratioMax) : false;
  const trend = i < n ? true : bars[i].close > bars[i - n].close;
  return (trend && !stress) ? 1 : 0;
}
