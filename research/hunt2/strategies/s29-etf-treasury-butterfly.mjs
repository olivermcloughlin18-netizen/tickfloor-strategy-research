export const meta = {
  id: "s29-etf-treasury-butterfly",
  name: "Treasury butterfly (IEF vs SHY/TLT wings) mean reversion",
  family: "mean_reversion",
  source: "Litterman & Scheinkman 1991 J. Fixed Income (curvature factor); relative-value butterfly practice (Tuckman & Serrat 2011)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["SHY", "IEF", "TLT"],
  rebalance: "daily",
  longShort: true,
  params: { window: 60, entryZ: 2, exitZ: 0.5, maxHold: 20 },
};

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const st = ctx.state;
  if (st.pos === undefined) { st.pos = 0; st.held = 0; }
  const a = universe.IEF, b = universe.TLT, c = universe.SHY;
  if (!a || !b || !c || a.length < p.window || b.length < p.window || c.length < p.window) return {};
  const s = [];
  for (let k = 1; k <= p.window; k++) {
    s.push(Math.log(a[a.length - k].close) - 0.5 * Math.log(b[b.length - k].close) - 0.5 * Math.log(c[c.length - k].close));
  }
  let m = 0;
  for (const x of s) m += x;
  m /= p.window;
  let v = 0;
  for (const x of s) v += (x - m) * (x - m);
  const sd = Math.sqrt(v / (p.window - 1));
  if (!(sd > 0)) return {};
  const z = (s[0] - m) / sd;
  if (st.pos !== 0) {
    st.held++;
    if (Math.abs(z) <= p.exitZ || st.held >= p.maxHold) { st.pos = 0; st.held = 0; }
  } else if (z <= -p.entryZ) { st.pos = 1; st.held = 0; }
  else if (z >= p.entryZ) { st.pos = -1; st.held = 0; }
  if (st.pos === 0) return {};
  return { IEF: 0.5 * st.pos, TLT: -0.25 * st.pos, SHY: -0.25 * st.pos };
}
