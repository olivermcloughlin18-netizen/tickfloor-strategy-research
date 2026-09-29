// Mechanical long-only rewrite of wide-equity-factors-industry-momentum.mjs (r24b batch, item B).
// The SECTOR map below is copied verbatim: it covers only the 40 US_STOCKS_DAILY tickers, not
// the full WIDE candidate list, so this id has no holdout coverage and is always INCONCLUSIVE
// on holdout (see prereg-2026-09-24b.md).
export const meta = {
  id: "r24b-lo-industry-momentum__rob1",
  name: "Industry momentum, long-only (static GICS-sector groups, top3) (wide US stocks) (-25%)",
  family: "equity-factors",
  source: "catalogue.json equity-factors-industry-momentum; long-only rewrite of wide-equity-factors-industry-momentum",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lookbackMonths: 5, topGroups: 3 },
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
  const { lookbackMonths, topGroups } = ctx.params;
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
  if (groups.length < topGroups) return {};

  const top = groups.slice(0, topGroups);
  const longSyms = top.flatMap((g) => groupMembers[g.g]);
  const w = {};
  for (const s of longSyms) w[s] = 1 / longSyms.length;
  return w;
}
