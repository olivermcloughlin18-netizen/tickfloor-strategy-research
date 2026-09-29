// Day-of-week seasonality (Monday effect). French 1980; Steeley 2001 replication.
// SPY is holdout -> QQQ proxy per README INDEX_PROXY rule.
export const meta = {
  id: "calendar-day-of-week-equity",
  name: "Day-of-week seasonality (Monday effect)",
  family: "seasonality",
  source: "French 1980 J. Financial Economics; Steeley 2001 replication",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ"],
  proxyFor: { SPY: "QQQ" },
  longShort: true,
  params: {},
};

// bar.time is epoch seconds (UTC midnight for daily bars). 1970-01-01 was a Thursday (UTC day 4).
export function signal(bars, i, ctx) {
  const dow = (Math.floor(bars[i].time / 86400) + 4) % 7; // 0=Sun..6=Sat
  if (dow === 5) return -1; // Friday close -> Monday close: short
  if (dow === 2 || dow === 3) return 1; // Tue close->Wed close, Wed close->Thu close: long
  return 0; // Mon->Tue and Thu->Fri: flat
}
