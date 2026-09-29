export const meta = {
  id: "r24b-crypto-max-lottery",
  name: "Crypto MAX Lottery",
  family: "volatility",
  source: "Grobys & Junttila 2021",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "weekly",
  params: { need: 30, lag: 2, lookback: 28, minNames: 8, minimumHold: 3, share: 0.3 },
};

export function rank(universe, t, ctx) {
  const scores = [];
  const symbols = Object.keys(universe);
  for (const sym of symbols) {
    const b = universe[sym];
    if (b.length < ctx.params.need) continue;
    const e = b.length - ctx.params.lag;
    let max = -Infinity;
    let valid = true;
    for (let k = e - ctx.params.lookback + 1; k <= e; k++) {
      const close = b[k].close;
      const prior = b[k - 1].close;
      if (!Number.isFinite(close) || !Number.isFinite(prior) || close <= 0 || prior <= 0) {
        valid = false;
        break;
      }
      max = Math.max(max, close / prior - 1);
    }
    if (valid) scores.push([sym, max]);
  }
  if (scores.length < ctx.params.minNames) {
    const w = {};
    for (const sym of symbols) w[sym] = 1 / symbols.length;
    return w;
  }
  scores.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const n = Math.max(ctx.params.minimumHold, Math.round(ctx.params.share * scores.length));
  const w = {};
  for (const [sym] of scores.slice(0, n)) w[sym] = 1 / n;
  return w;
}
