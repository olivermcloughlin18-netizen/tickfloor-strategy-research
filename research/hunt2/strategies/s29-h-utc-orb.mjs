export const meta = {
  id: "s29-h-utc-orb",
  name: "UTC-day opening-range breakout (first 4 hours)",
  family: "trend",
  source: "Crabel 1990 (opening range breakout); Zarattini & Aziz 2023 SSRN 'Can day trading really be profitable?' (ORB)",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  longShort: true,
  params: { rangeHours: 4, lastEntryHour: 22, exitHour: 23 },
};

export function signal(bars, i, ctx) {
  const { rangeHours, lastEntryHour } = ctx.params;
  const s = ctx.state;
  const b = bars[i];
  const day = Math.floor(b.time / 86400);
  const h = Math.floor(b.time / 3600) % 24;
  if (s.day !== day) { s.day = day; s.hi = -Infinity; s.lo = Infinity; s.mask = 0; s.dir = 0; }
  if (h < rangeHours) {
    if (b.high > s.hi) s.hi = b.high;
    if (b.low < s.lo) s.lo = b.low;
    s.mask |= 1 << h;
    return 0;
  }
  if (h > lastEntryHour) return 0;
  if (s.mask !== (1 << rangeHours) - 1) return 0;
  if (s.dir === 0) {
    if (b.close > s.hi) s.dir = 1;
    else if (b.close < s.lo) s.dir = -1;
  }
  return s.dir;
}
