// Robustness variant 1: same rule, different single proxy (DIA instead of QQQ).
export const meta = {
  id: "wide-calendar-day-of-week-equity__rob1",
  name: "Day-of-week seasonality (Monday effect) — DIA proxy (wide US stocks)",
  family: "seasonality",
  source: "French 1980 J. Financial Economics; Steeley 2001 replication",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  longShort: true,
  params: {},
};

export function signal(bars, i, ctx) {
  const dow = (Math.floor(bars[i].time / 86400) + 4) % 7; // 0=Sun..6=Sat
  if (dow === 5) return -1; // Friday close -> Monday close: short
  if (dow === 2 || dow === 3) return 1; // Tue close->Wed close, Wed close->Thu close: long
  return 0;
}
