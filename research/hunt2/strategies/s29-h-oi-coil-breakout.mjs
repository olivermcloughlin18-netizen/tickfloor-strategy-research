export const meta = {
  id: "s29-h-oi-coil-breakout",
  name: "Coiled leverage: open interest builds on a flat price, trade the 24h breakout",
  family: "other",
  source: "Kaiko / Glassnode derivatives research on OI build-ups before volatility expansions; Brunnermeier & Pedersen 2009 (crowded positions unwind)",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  longShort: true,
  holdBars: 12,
  params: { oiWindow: 24, oiRise: 0.05, flatBand: 0.01, holdBars: 12 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (i < p.oiWindow + 1) return 0;

  const oiNow = ctx.openInterest(i - 1);
  const oiPast = ctx.openInterest(i - p.oiWindow - 1);
  if (oiNow === null || oiPast === null) return 0;

  const priceChange = bars[i - 1].close / bars[i - p.oiWindow - 1].close - 1;
  if (oiNow / oiPast - 1 < p.oiRise || Math.abs(priceChange) > p.flatBand) return 0;

  const channel = ctx.donchian(p.oiWindow, i - 1);
  if (bars[i].close > channel.upper) return 1;
  if (bars[i].close < channel.lower) return -1;
  return 0;
}
