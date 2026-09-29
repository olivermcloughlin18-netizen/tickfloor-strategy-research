export const meta = {
  id: "r24b-ctrl-drop-crypto",
  name: "Crypto Drop Control",
  family: "deep-validation-control",
  source: "Preregistered control",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "weekly",
  params: { need: 8, lag: 2, lookback: 7, minNames: 8, minimumHold: 3, share: 0.3 },
};

export function rank(universe, t, ctx) {
  const scores = [];
  const symbols = Object.keys(universe);
  for (const sym of symbols) {
    const b = universe[sym];
    if (b.length < ctx.params.need) continue;
    const e = b.length - ctx.params.lag;
    const recent = b[e] && b[e].close;
    const prior = b[e - ctx.params.lookback] && b[e - ctx.params.lookback].close;
    if (!Number.isFinite(recent) || !Number.isFinite(prior) || recent <= 0 || prior <= 0) continue;
    scores.push([sym, recent / prior - 1]);
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
