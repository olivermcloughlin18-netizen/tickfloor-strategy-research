// Industry momentum. No industry-classification feed exists, so sectors are a fixed static
// GICS-sector lookup for the 40 US_STOCKS_DAILY tickers (public, immutable metadata, not a
// fundamentals data feed). 8 groups stand in for FF 12/49.
export const meta = {
  id: "wide-equity-factors-industry-momentum",
  name: "Industry momentum (static GICS-sector groups, top3/bottom3) (wide US stocks)",
  family: "equity-factors",
  source: "catalogue.json equity-factors-industry-momentum",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  longShort: true,
  params: { lookbackMonths: 6, topGroups: 3, bottomGroups: 3 },
};

const SECTOR = {
  AAPL: "tech", NVDA: "tech", MSFT: "tech", AVGO: "tech", ORCL: "tech", ADBE: "tech", CRM: "tech", AMD: "tech", INTC: "tech", QCOM: "tech", TXN: "tech",
  GOOGL: "comm", META: "comm", NFLX: "comm", DIS: "comm", T: "comm",
  AMZN: "discretionary", TSLA: "discretionary", MCD: "discretionary", LOW: "discretionary", SBUX: "discretionary",
  JPM: "financial", V: "financial", BAC: "financial",
  UNH: "health", JNJ: "health", ABBV: "health", MRK: "health", ABT: "health", PFE: "health", MDT: "health",
  XOM: "energy", CVX: "energy",
  COST: "staples", WMT: "staples",
  HON: "industrial", CAT: "industrial", BA: "industrial", UPS: "industrial", UNP: "industrial", MMM: "industrial",
};

export function rank(universe, t, ctx) {
  const { lookbackMonths, topGroups, bottomGroups } = ctx.params;
  const groupRets = {};
  const groupMembers = {};
  for (const sym of Object.keys(universe)) {
    const group = SECTOR[sym];
    if (!group) continue;
    const bars = universe[sym];
    if (bars.length < 30) continue;
    const monthly = ctx.resample(bars, "1M").filter((m) => m.complete);
    if (monthly.length < lookbackMonths) continue;
    const last = monthly.length - 1;
    const ret = monthly[last].close / monthly[last - lookbackMonths + 1].open - 1;
    (groupRets[group] ||= []).push(ret);
    (groupMembers[group] ||= []).push(sym);
  }
  const groups = Object.keys(groupRets)
    .map((g) => ({ g, ret: groupRets[g].reduce((a, b) => a + b, 0) / groupRets[g].length }))
    .sort((a, b) => b.ret - a.ret);
  if (groups.length < topGroups + bottomGroups) return {};

  const top = groups.slice(0, topGroups);
  const bottom = groups.slice(-bottomGroups);
  const w = {};
  const longSyms = top.flatMap((g) => groupMembers[g.g]);
  const shortSyms = bottom.flatMap((g) => groupMembers[g.g]);
  for (const s of longSyms) w[s] = 0.5 / longSyms.length;
  for (const s of shortSyms) w[s] = (w[s] || 0) - 0.5 / shortSyms.length;
  return w;
}
