export const meta = {
  id: "s29-h-low-volume-move-fade",
  name: "Fade six-hour moves made on below-average volume",
  family: "mean_reversion",
  source: "Granville 1963 (volume confirms price); Campbell, Grossman & Wang 1993 QJE (volume and serial correlation) as the competing view",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  longShort: true,
  holdBars: 6,
  params: { window: 6, move: 0.03, base: 168, holdBars: 6 },
};

export function signal(bars, i, ctx) {
  const { window, move, base } = ctx.params;
  if (i < window + base) return 0;

  const r6 = bars[i].close / bars[i - window].close - 1;
  const v6 = ctx.sma("volume", window, i);
  const vb = ctx.sma("volume", base, i - window);
  if (v6 >= vb) return 0;
  if (r6 >= move) return -1;
  if (r6 <= -move) return 1;
  return 0;
}
