// Price vs 10-week moving average of weekly closes, long-only, weekly rebalance.
// Detzel, Liu, Strauss, Zhou & Zhu 2021 Financial Management (price over 1-20 week
// moving averages predicts bitcoin returns); Brock, Lakonishok & LeBaron 1992 JF;
// u/VettaQ, r/CryptoMarkets 1wp3tyi (the zero-fee rerun: costs are the first
// objection, so decide weekly).
export const meta = {
  id: "r27-cx-wma10w",
  name: "Crypto weekly close vs 10-week average",
  family: "trend",
  source: "Detzel, Liu, Strauss, Zhou & Zhu 2021 Financial Management (price over 1-20 week moving averages predicts bitcoin returns); Brock, Lakonishok & LeBaron 1992 JF; u/VettaQ, r/CryptoMarkets 1wp3tyi (the zero-fee rerun: costs are the first objection, so decide weekly)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  params: { weeks: 10 },
};

// Stateless: fully re-derived from completed weekly bars each call, so the
// position can only change when a new week completes (Sunday close).
export function signal(bars, i, ctx) {
  const { weeks } = ctx.params;
  const W = ctx.resample(bars, "1w").filter((w) => w.complete);
  if (W.length < weeks) return 1; // warm-up: hold, same as buy-and-hold

  const last = W.length - 1;
  let sum = 0;
  for (let k = last - weeks + 1; k <= last; k++) sum += W[k].close;
  const m = sum / weeks;

  return W[last].close > m ? 1 : 0;
}
