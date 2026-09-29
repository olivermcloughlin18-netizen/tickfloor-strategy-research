export const meta = {
  id: "s29-etf-credit-spread-revert",
  name: "Credit ETF reversion after spread-widening underperformance",
  family: "mean_reversion",
  source: "Prigent, Renault & Scaillet 2001 (mean reversion in credit spreads); Collin-Dufresne, Goldstein & Martin 2001 JF",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["HYG", "LQD", "IEF"],
  rebalance: "daily",
  longShort: false,
  params: { lookback: 20, gap: -0.015, holdDays: 20 },
};

export function rank(universe, t, ctx) {
  if (ctx.state.holds === undefined) ctx.state.holds = {};

  const holds = ctx.state.holds;
  for (const symbol of ["HYG", "LQD"]) {
    if (holds[symbol] > 0 && --holds[symbol] === 0) delete holds[symbol];
  }

  const treasury = universe.IEF;
  const n = ctx.params.lookback;
  if (treasury && treasury.length > n) {
    const treasuryReturn = treasury[treasury.length - 1].close / treasury[treasury.length - 1 - n].close - 1;
    for (const symbol of ["HYG", "LQD"]) {
      const bars = universe[symbol];
      if (!holds[symbol] && bars && bars.length > n) {
        const creditReturn = bars[bars.length - 1].close / bars[bars.length - 1 - n].close - 1;
        if (creditReturn - treasuryReturn <= ctx.params.gap) holds[symbol] = ctx.params.holdDays;
      }
    }
  }

  const held = ["HYG", "LQD"].filter((symbol) => holds[symbol] > 0);
  const weights = {};
  for (const symbol of held) weights[symbol] = 1 / held.length;
  return weights;
}
