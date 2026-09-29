// MATCHED NAIVE CONTROL for corrbk-decoupling-reconvergence-etf.
// Identical universe, identical fixed pair list, identical sizing, identical hold, identical costs,
// identical benchmark. The ONLY difference: the correlation-breakdown condition is replaced by `true`.
// If this control does as well per trade as the conditional version, the "decoupling" mechanism adds
// nothing and the hypothesis is dead.

export const meta = {
  id: "corrbk-control-gap-reversion-etf",
  name: "Control: 20d relative-gap reversion on fixed ETF pairs, no correlation condition",
  family: "mean_reversion",
  source: "Matched naive control for the correlation-breakdown hypothesis (hunt2 lane sonnet-9)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["GLD", "SLV", "TLT", "IEF", "HYG", "LQD", "AGG", "XLK", "QQQ", "XLE", "DBC", "XLP", "XLU", "XLB", "XLI"],
  rebalance: "daily",
  longShort: true,
  params: {
    baseWindow: 252,
    shortWindow: 20,
    minBaseCorr: 0.70,
    corrDrop: 0,        // <- the control: no decoupling required
    minGap: 0.03,
    holdDays: 10,
    maxOpen: 4,
    legWeight: 0.125,
  },
};

const PAIRS = [
  ["GLD", "SLV"],
  ["TLT", "IEF"],
  ["HYG", "LQD"],
  ["LQD", "AGG"],
  ["XLK", "QQQ"],
  ["XLE", "DBC"],
  ["XLP", "XLU"],
  ["XLB", "XLI"],
];

const DAYSEC = 86400;

// last n+1 closes that both series share a calendar day for, oldest first; null if not enough
function commonCloses(ba, bb, n) {
  let i = ba.length - 1, j = bb.length - 1;
  const out = [];
  while (i >= 0 && j >= 0 && out.length < n + 1) {
    const da = Math.floor(ba[i].time / DAYSEC), db = Math.floor(bb[j].time / DAYSEC);
    if (da === db) { out.push([ba[i].close, bb[j].close]); i--; j--; }
    else if (da > db) i--;
    else j--;
  }
  if (out.length < n + 1) return null;
  out.reverse();
  return out;
}

// two-pass Pearson correlation (no running sums: one warm-up NaN cannot poison later values)
function corr(x, y) {
  const n = x.length;
  if (n < 2) return NaN;
  let sx = 0, sy = 0;
  for (let k = 0; k < n; k++) { sx += x[k]; sy += y[k]; }
  const mx = sx / n, my = sy / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let k = 0; k < n; k++) {
    const a = x[k] - mx, b = y[k] - my;
    sxx += a * a; syy += b * b; sxy += a * b;
  }
  const d = Math.sqrt(sxx * syy);
  return d > 0 ? sxy / d : NaN;
}

function pairStats(ba, bb, p) {
  const c = commonCloses(ba, bb, p.baseWindow);
  if (!c) return null;
  const n = c.length;
  const ra = [], rb = [];
  for (let k = 1; k < n; k++) {
    const a = c[k][0] / c[k - 1][0] - 1, b = c[k][1] / c[k - 1][1] - 1;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    ra.push(a); rb.push(b);
  }
  const baseCorr = corr(ra, rb);
  const shortCorr = corr(ra.slice(-p.shortWindow), rb.slice(-p.shortWindow));
  const gapA = c[n - 1][0] / c[n - 1 - p.shortWindow][0] - 1;
  const gapB = c[n - 1][1] / c[n - 1 - p.shortWindow][1] - 1;
  if (!Number.isFinite(baseCorr) || !Number.isFinite(shortCorr) || !Number.isFinite(gapA) || !Number.isFinite(gapB)) return null;
  return { baseCorr, shortCorr, gap: gapA - gapB };
}

export function rank(universe, t, ctx) {
  const p = ctx.params;
  if (ctx.state.n === undefined) { ctx.state.n = 0; ctx.state.open = {}; }
  ctx.state.n++;
  const now = ctx.state.n;
  const open = ctx.state.open;

  // close expired positions, and any position whose legs stopped trading
  for (const key of Object.keys(open)) {
    const o = open[key];
    if (now - o.entry >= p.holdDays || !universe[o.a] || !universe[o.b]) delete open[key];
  }

  // candidate entries
  const cands = [];
  for (const [a, b] of PAIRS) {
    const key = a + "/" + b;
    if (open[key]) continue;
    const ba = universe[a], bb = universe[b];
    if (!ba || !bb) continue;
    const s = pairStats(ba, bb, p);
    if (!s) continue;
    if (s.baseCorr < p.minBaseCorr) continue;
    if (!(s.baseCorr - s.shortCorr >= p.corrDrop)) continue;
    if (Math.abs(s.gap) < p.minGap) continue;
    cands.push({ key, a, b, gap: s.gap });
  }
  cands.sort((x, y) => Math.abs(y.gap) - Math.abs(x.gap) || (x.key < y.key ? -1 : 1));

  for (const c of cands) {
    if (Object.keys(open).length >= p.maxOpen) break;
    // bet on re-convergence: long the laggard, short the leader
    open[c.key] = { a: c.a, b: c.b, entry: now, sign: c.gap > 0 ? -1 : 1 };
  }

  const w = {};
  for (const key of Object.keys(open)) {
    const o = open[key];
    w[o.a] = (w[o.a] || 0) + o.sign * p.legWeight;
    w[o.b] = (w[o.b] || 0) - o.sign * p.legWeight;
  }
  for (const s of Object.keys(w)) if (w[s] === 0) delete w[s];
  return w;
}
