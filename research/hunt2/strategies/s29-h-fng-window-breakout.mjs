export const meta = {
  id: "s29-h-fng-window-breakout",
  name: "72-hour breakout taken only in neutral-to-greedy sentiment",
  family: "trend",
  source: "Antoniou, Doukas & Subrahmanyam 2013 JFQA (momentum works in optimistic, not extreme, sentiment); alternative.me F&G",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  longShort: false,
  holdBars: 24,
  params: { channel: 72, fngLo: 45, fngHi: 70, holdBars: 24 },
};

export function signal(bars, i, ctx) {
  const { channel, fngLo, fngHi } = ctx.params;
  if (i < channel) return 0;

  const fng = ctx.macro("FNG", i) ?? 0;
  const priorHigh = ctx.donchian(channel, i - 1).upper;
  return bars[i].close > priorHigh && fng >= fngLo && fng <= fngHi ? 1 : 0;
}
