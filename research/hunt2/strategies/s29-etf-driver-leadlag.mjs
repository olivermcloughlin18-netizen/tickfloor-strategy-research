export const meta = {
  id: "s29-etf-driver-leadlag",
  name: "Sector and metal ETFs catch up to their underlying drivers",
  family: "momentum",
  source: "Hong, Torous & Valkanov 2007 JFE; Driesprong, Jacobsen & Maat 2008 JFE",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLE", "USO", "XLB", "DBC", "VNQ", "XLU", "TLT", "SLV", "GLD"],
  rebalance: "weekly",
  params: { lookback: 10, gap: 0.02 },
};

const PAIRS = [["XLE", "USO"], ["XLB", "DBC"], ["VNQ", "TLT"], ["XLU", "TLT"], ["SLV", "GLD"]];

export function rank(universe, t, ctx) {
  const n = ctx.params.lookback;
  const r = (s) => {
    const b = universe[s];
    return b && b.length > n ? b[b.length - 1].close / b[b.length - 1 - n].close - 1 : null;
  };
  const act = [];
  for (const [f, d] of PAIRS) {
    const rf = r(f), rd = r(d);
    if (rf === null || rd === null) continue;
    if (rd - rf >= ctx.params.gap) act.push(f);
  }
  const w = {};
  for (const f of act) w[f] = 1 / act.length;
  return w;
}
