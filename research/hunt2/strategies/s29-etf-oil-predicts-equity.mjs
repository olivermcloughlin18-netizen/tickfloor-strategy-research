export const meta = {
  id: "s29-etf-oil-predicts-equity",
  name: "Rising oil predicts weak equities (Driesprong)",
  family: "other",
  source: "Driesprong, Jacobsen & Maat 2008 JFE ('Striking oil: another puzzle?')",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "DIA", "USO", "IEF"],
  rebalance: "monthly",
  params: { lookback: 21 },
};

export function rank(universe, t, ctx) {
  const n = ctx.params.lookback;
  const u = universe.USO;
  if (!u || u.length <= n) return {};
  const r = u[u.length - 1].close / u[u.length - 1 - n].close - 1;
  return r > 0 ? { IEF: 1 } : { QQQ: 0.5, DIA: 0.5 };
}
