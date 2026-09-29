export const meta = {
  id: "s29-us-rs-line-lead",
  name: "Relative-strength line at a new high before price",
  family: "momentum",
  source: "O'Neil / IBD 'RS line leads price' rule; Bulkowski 2005",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_DAILY",
  rebalance: "weekly",
  params: { window: 252, belowHigh: 0.95, holdWeeks: 4 },
};

export function rank(universe, t, ctx) {
  const p = ctx.params, s = ctx.state;
  if (s.cnt === undefined) s.cnt = {};
  for (const k of Object.keys(s.cnt)) if (s.cnt[k] > 0) s.cnt[k]--;
  const syms = Object.keys(universe).filter((y) => universe[y].length >= p.window + 1);
  if (!syms.length) return {};
  // EW index over the last window days, built from returns of stocks trading each day
  const idx = new Array(p.window).fill(1);
  const byTime = {};
  for (const y of syms) {
    const b = universe[y];
    for (let k = b.length - p.window; k < b.length; k++) byTime[b[k].time] = byTime[b[k].time] || [];
  }
  let I = 1;
  const ref = universe[syms[0]];
  const I_at = {};
  for (let k = ref.length - p.window; k < ref.length; k++) {
    const tm = ref[k].time;
    let sum = 0, c = 0;
    for (const y of syms) {
      const b = universe[y];
      const j = b.length - (ref.length - k);
      if (j >= 1 && b[j].time === tm) { sum += b[j].close / b[j - 1].close - 1; c++; }
    }
    I *= 1 + (c ? sum / c : 0);
    I_at[k] = I;
  }
  for (const y of syms) {
    const b = universe[y];
    const off = ref.length - b.length; // aligned to the end (all traded on t)
    let maxRS = -Infinity, maxC = -Infinity;
    for (let k = b.length - p.window; k < b.length; k++) {
      const rs = b[k].close / I_at[k + off];
      if (rs > maxRS) maxRS = rs;
      if (b[k].close > maxC) maxC = b[k].close;
    }
    const last = b.length - 1;
    const rsT = b[last].close / I_at[last + off];
    if (rsT >= maxRS && b[last].close <= p.belowHigh * maxC) s.cnt[y] = p.holdWeeks;
  }
  const held = Object.keys(s.cnt).filter((y) => s.cnt[y] > 0 && universe[y]);
  const w = {};
  for (const y of held) w[y] = 1 / held.length;
  return w;
}
