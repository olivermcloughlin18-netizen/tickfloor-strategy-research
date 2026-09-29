// terra-9 MATCHED NAIVE CONTROL.
// Identical pair formation, spread, z-score, entry/exit, leg weights, frequency and costs as
// terra9-corr-breakdown-pairs.mjs. The ONLY difference is that this file has no
// correlation-breakdown gate on entry: it trades every spread-z extreme.

export const meta = {
  id: "terra9-pair-spread-ungated",
  name: "Ungated ETF pair spread reversion (matched control for correlation-breakdown gate)",
  family: "mean-reversion-statarb",
  source: "matched naive control for terra-9 correlation-breakdown hypothesis",
  assetClass: "etf",
  timeframe: "1d",
  universe: "ETFS_DAILY",
  rebalance: "daily",
  longShort: true,
  params: {
    formWindow: 252,
    formEvery: 21,
    zWindow: 60,
    zEntry: 2.0,
    zExit: 0.5,
    zStop: 4.0,
    maxHold: 30,
    nPairs: 3,
    minCorr: 0.7,
  },
};

// --- plain arithmetic helpers (no running sums: a single NaN would poison them forever) ---

function logRets(bars, n) {
  const end = bars.length - 1;
  const out = new Array(n);
  for (let k = 0; k < n; k++) {
    const j = end - n + 1 + k;
    const a = bars[j].close, b = bars[j - 1].close;
    out[k] = a > 0 && b > 0 ? Math.log(a / b) : NaN;
  }
  return out;
}

function corrRange(x, y, from, to) {
  const n = to - from + 1;
  if (n < 3) return NaN;
  let sx = 0, sy = 0;
  for (let k = from; k <= to; k++) {
    if (!Number.isFinite(x[k]) || !Number.isFinite(y[k])) return NaN;
    sx += x[k]; sy += y[k];
  }
  const mx = sx / n, my = sy / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let k = from; k <= to; k++) {
    const a = x[k] - mx, b = y[k] - my;
    sxx += a * a; syy += b * b; sxy += a * b;
  }
  const d = Math.sqrt(sxx * syy);
  return d > 0 ? sxy / d : NaN;
}

// slope of log(yBars) regressed on log(xBars) over the last n closes
function olsSlopeLog(yBars, xBars, n) {
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let k = 0; k < n; k++) {
    const yc = yBars[yBars.length - n + k].close;
    const xc = xBars[xBars.length - n + k].close;
    if (!(yc > 0) || !(xc > 0)) return NaN;
    const y = Math.log(yc), x = Math.log(xc);
    sx += x; sy += y; sxx += x * x; sxy += x * y;
  }
  const den = n * sxx - sx * sx;
  return den === 0 ? NaN : (n * sxy - sx * sy) / den;
}

function formPairs(universe, P) {
  const syms = Object.keys(universe).sort();
  const rets = {};
  for (let s = 0; s < syms.length; s++) {
    const b = universe[syms[s]];
    if (!b || b.length < P.formWindow + 1) continue;
    const r = logRets(b, P.formWindow);
    let ok = true;
    for (let k = 0; k < r.length; k++) if (!Number.isFinite(r[k])) { ok = false; break; }
    if (ok) rets[syms[s]] = r;
  }
  const keys = Object.keys(rets).sort();
  const cands = [];
  for (let a = 0; a < keys.length; a++) {
    for (let b = a + 1; b < keys.length; b++) {
      const c = corrRange(rets[keys[a]], rets[keys[b]], 0, P.formWindow - 1);
      if (Number.isFinite(c) && c >= P.minCorr) cands.push({ a: keys[a], b: keys[b], c });
    }
  }
  cands.sort((u, v) => (v.c - u.c) || (u.a + "|" + u.b < v.a + "|" + v.b ? -1 : 1));
  const sel = cands.slice(0, P.nPairs);
  const out = [];
  for (let k = 0; k < sel.length; k++) {
    const beta = olsSlopeLog(universe[sel[k].a], universe[sel[k].b], P.formWindow);
    if (Number.isFinite(beta)) out.push({ a: sel[k].a, b: sel[k].b, beta });
  }
  return out;
}

function spreadZ(universe, p, P) {
  const A = universe[p.a], B = universe[p.b];
  if (!A || !B || A.length < P.zWindow || B.length < P.zWindow) return NaN;
  const sp = new Array(P.zWindow);
  for (let k = 0; k < P.zWindow; k++) {
    const ac = A[A.length - P.zWindow + k].close;
    const bc = B[B.length - P.zWindow + k].close;
    if (!(ac > 0) || !(bc > 0)) return NaN;
    sp[k] = Math.log(ac) - p.beta * Math.log(bc);
  }
  let s = 0;
  for (let k = 0; k < P.zWindow; k++) { if (!Number.isFinite(sp[k])) return NaN; s += sp[k]; }
  const m = s / P.zWindow;
  let ss = 0;
  for (let k = 0; k < P.zWindow; k++) { const d = sp[k] - m; ss += d * d; }
  const sd = Math.sqrt(ss / (P.zWindow - 1));
  return sd > 0 ? (sp[P.zWindow - 1] - m) / sd : NaN;
}

export function rank(universe, t, ctx) {
  const P = ctx.params;
  if (ctx.state.calls === undefined) { ctx.state.calls = 0; ctx.state.pairs = []; ctx.state.pos = {}; }

  if (ctx.state.calls % P.formEvery === 0) {
    const sel = formPairs(universe, P);
    const keep = {};
    for (let k = 0; k < sel.length; k++) {
      const key = sel[k].a + "|" + sel[k].b;
      if (ctx.state.pos[key]) keep[key] = ctx.state.pos[key];
    }
    ctx.state.pairs = sel;
    ctx.state.pos = keep;
  }
  ctx.state.calls++;

  const w = {};
  const legW = 1 / (2 * P.nPairs);
  for (let k = 0; k < ctx.state.pairs.length; k++) {
    const p = ctx.state.pairs[k];
    const key = p.a + "|" + p.b;
    if (!universe[p.a] || !universe[p.b]) { delete ctx.state.pos[key]; continue; }
    const z = spreadZ(universe, p, P);
    if (!Number.isFinite(z)) { delete ctx.state.pos[key]; continue; }

    let st = ctx.state.pos[key];
    if (st) {
      st.held++;
      if (Math.abs(z) <= P.zExit || Math.abs(z) >= P.zStop || st.held >= P.maxHold) {
        delete ctx.state.pos[key];
        st = undefined;
      }
    }
    if (!st && Math.abs(z) >= P.zEntry && Math.abs(z) < P.zStop) {
      // CONTROL: no correlation-breakdown gate here.
      st = { dir: z <= -P.zEntry ? 1 : -1, held: 0 };
      ctx.state.pos[key] = st;
    }
    if (st) {
      w[p.a] = (w[p.a] || 0) + st.dir * legW;
      w[p.b] = (w[p.b] || 0) - st.dir * legW;
    }
  }

  let tot = 0;
  for (const s in w) tot += Math.abs(w[s]);
  if (tot > 1) for (const s in w) w[s] = w[s] / tot;
  return w;
}
