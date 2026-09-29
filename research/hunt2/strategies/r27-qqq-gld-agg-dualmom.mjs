// prereg C4 r27: dual momentum among QQQ/GLD/AGG. Pick the stronger of QQQ/GLD on 252-session
// momentum, hold it only if it beats AGG's momentum too, else hold AGG. Follow-up of
// r25-qqq-agg-dualmom (p = 0.044): same construction, adds gold as a second candidate risk asset.
export const meta = {
  id: "r27-qqq-gld-agg-dualmom",
  name: "Dual momentum QQQ or GLD, AGG as the safe asset",
  family: "momentum",
  source: "Antonacci 2014 'Dual Momentum Investing'; Moskowitz, Ooi & Pedersen 2012 JFE. Follow-up of r25-qqq-agg-dualmom (p = 0.044); a new test. Static-tilt risk declared: it holds a risk asset most months against a 1/3 AGG benchmark share, so the static twin decides.",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "GLD", "AGG"],
  rebalance: "monthly",
  params: { lag: 2, lookback: 252, need: 254 },
};

function ew(universe) {
  const syms = Object.keys(universe);
  const w = {};
  for (const s of syms) w[s] = 1 / syms.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { lag, lookback, need } = ctx.params;
  const qqq = universe.QQQ;
  const gld = universe.GLD;
  const agg = universe.AGG;
  if (!qqq || !gld || !agg) return ew(universe);
  if (qqq.length < need || gld.length < need || agg.length < need) return ew(universe);

  const R = (b) => {
    const e = b.length - lag;
    return b[e].close / b[e - lookback].close - 1;
  };
  const rq = R(qqq);
  const rg = R(gld);
  const ra = R(agg);
  if (!Number.isFinite(rq) || !Number.isFinite(rg) || !Number.isFinite(ra)) return ew(universe);

  const cand = rq > rg ? "QQQ" : "GLD";
  const rcand = cand === "QQQ" ? rq : rg;
  if (rcand > ra) return { [cand]: 1 };
  return { AGG: 1 };
}
