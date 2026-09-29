export const meta = {
  id: "s29-cx-breadth-thrust",
  name: "Crypto breadth thrust (Zweig-style)",
  family: "momentum",
  source: "Zweig 1986 'Winning on Wall Street' (breadth thrust)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "daily",
  params: { sma: 20, hi: 0.7, lo: 0.3, window: 10, holdDays: 20, minNames: 6 },
};

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const s = ctx.state;
  if (s.hist === undefined) { s.hist = []; s.counter = 0; }
  const elig = [];
  let above = 0;
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < p.sma + 1) continue;
    let sum = 0;
    for (let k = b.length - p.sma; k < b.length; k++) sum += b[k].close;
    elig.push(sym);
    if (b[b.length - 1].close > sum / p.sma) above++;
  }
  if (elig.length < p.minNames) return {};
  const br = above / elig.length;
  let thrust = false;
  if (s.hist.length >= p.window && br >= p.hi) {
    let mn = Infinity;
    for (let k = s.hist.length - p.window; k < s.hist.length; k++) if (s.hist[k] < mn) mn = s.hist[k];
    thrust = mn <= p.lo;
  }
  s.hist.push(br);
  if (thrust) s.counter = p.holdDays;
  if (s.counter <= 0) return {};
  s.counter--;
  const w = {};
  for (const sym of elig) w[sym] = 1 / elig.length;
  return w;
}
