// Crypto BTC hour-of-day seasonality: long top-3 mean-return UTC hours, short bottom-3,
// using a rolling 2yr trailing window per hour bucket (no lookahead).
// Source: Baur, Dimpfl, Kuck 2018 Finance Research Letters (BTC intraday patterns).

export const meta = {
  id: "calendar-crypto-hour-of-day",
  name: "Crypto hour-of-day seasonality",
  family: "seasonality",
  source: "Baur, Dimpfl, Kuck 2018 Finance Research Letters (BTC intraday patterns)",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT"],
  longShort: true,
  params: { hoursPerBucketWindow: 730, topN: 3 }, // 730 ~= 2yr of samples for one hour-of-day bucket (17520h/24)
};

export function signal(bars, i, ctx) {
  const n = ctx.params.hoursPerBucketWindow;
  const topN = ctx.params.topN;

  if (ctx.state.buckets === undefined) {
    ctx.state.buckets = [];
    for (let h = 0; h < 24; h++) ctx.state.buckets.push(ctx.rolling(n));
  }
  const buckets = ctx.state.buckets;

  const hour = Math.floor(bars[i].time / 3600) % 24;

  // Decide using only buckets fully warmed BEFORE this bar's push (no lookahead).
  let signalOut = 0;
  const means = new Array(24).fill(NaN);
  let full = 0;
  for (let h = 0; h < 24; h++) {
    if (buckets[h].full()) {
      means[h] = buckets[h].mean();
      full++;
    }
  }
  if (full === 24) {
    const order = means.map((m, h) => [m, h]).sort((a, b) => b[0] - a[0]);
    const topHours = new Set(order.slice(0, topN).map((x) => x[1]));
    const botHours = new Set(order.slice(24 - topN).map((x) => x[1]));
    if (topHours.has(hour)) signalOut = 1;
    else if (botHours.has(hour)) signalOut = -1;
  }

  // Push this bar's return into its own hour bucket for future bars.
  if (i > 0) {
    const ret = bars[i].close / bars[i - 1].close - 1;
    buckets[hour].push(ret);
  }

  return signalOut;
}
