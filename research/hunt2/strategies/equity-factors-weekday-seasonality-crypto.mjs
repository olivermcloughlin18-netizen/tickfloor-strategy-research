export const meta = {
  id: "equity-factors-weekday-seasonality-crypto",
  name: "Crypto weekday seasonality (long Sundays only)",
  family: "seasonality",
  source: "retail folklore of a crypto 'weekend pump'/Sunday effect (UTC calendar day). " +
    "Weekday fixed before the first run per README, not chosen from the data.",
  assetClass: "crypto",
  timeframe: "1d",
  params: {
    weekdayUTC: 0, // 0 = Sunday (JS getUTCDay convention on the bar's own UTC day)
  },
};

// bar.time is epoch seconds, the bar's UTC open. signal(bars,i,ctx) sets the position
// held from close[i] to close[i+1], i.e. during the NEXT calendar day. Compute that next
// day's weekday by arithmetic on bar i's own timestamp (+86400s) rather than reading
// bars[i+1], which the harness forbids.
export function signal(bars, i, ctx) {
  const nextDayEpoch = Math.floor((bars[i].time + 86400) / 86400);
  // 1970-01-01 was a Thursday (weekday 4)
  const weekday = (nextDayEpoch + 4) % 7;
  return weekday === ctx.params.weekdayUTC ? 1 : 0;
}
