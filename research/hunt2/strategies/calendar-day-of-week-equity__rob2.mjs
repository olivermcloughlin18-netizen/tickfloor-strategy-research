// Robustness variant 2: same rule, applied across the whole ETF universe (>=2 assets)
// instead of a single index proxy, to test generalization and satisfy the >=2-asset gate.
export const meta = {
  id: "calendar-day-of-week-equity__rob2",
  name: "Day-of-week seasonality (Monday effect) — full ETF universe",
  family: "seasonality",
  source: "French 1980 J. Financial Economics; Steeley 2001 replication",
  assetClass: "etf",
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
