export const meta = {
  id: "s29-etf-turbulence-index",
  name: "Kritzman-Li turbulence index risk-off",
  family: "volatility",
  source: "Kritzman & Li 2010 FAJ ('Skulls, financial turbulence, and risk management')",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLK","XLF","XLE","XLV","XLI","XLP","XLY","XLU","XLB","TLT","GLD","QQQ","DIA","SHY"],
  rebalance: "daily",
  params: { covWindow: 252, pct: 0.9, histWindow: 252, offDays: 10 },
};

const SYMS = ["XLK","XLF","XLE","XLV","XLI","XLP","XLY","XLU","XLB","TLT","GLD"];

function solve(A, y) { // Gauss-Jordan with partial pivoting: A x = y
  const n = y.length;
  const M = A.map((r, i) => [...r, y[i]]);
  for (let c = 0; c < n; c++) {
    let pv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[pv][c])) pv = r;
    if (Math.abs(M[pv][c]) < 1e-18) return null;
    [M[c], M[pv]] = [M[pv], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const st = ctx.state;
  if (st.d === undefined) { st.d = []; st.counter = 0; }
  const W = p.covWindow, N = SYMS.length;
  const bs = SYMS.map((s) => universe[s]);
  const ok = bs.every((b) => b && b.length >= W + 2);
  if (ok) {
    // returns at days t-W..t (W+1 rows), aligned by index from the end; times must match
    const R = [];
    let aligned = true;
    for (let j = 0; j <= W; j++) {
      const row = [];
      const tm = bs[0][bs[0].length - 1 - j].time;
      for (let q = 0; q < N; q++) {
        const b = bs[q], e = b.length - 1 - j;
        if (b[e].time !== tm) aligned = false;
        row.push(b[e].close / b[e - 1].close - 1);
      }
      R.push(row);
    }
    if (aligned) {
      const x = R[0];
      const H = R.slice(1); // W prior days
      const mu = new Array(N).fill(0);
      for (const r of H) for (let q = 0; q < N; q++) mu[q] += r[q] / W;
      const S = Array.from({ length: N }, () => new Array(N).fill(0));
      for (const r of H) for (let a = 0; a < N; a++) for (let b = a; b < N; b++) S[a][b] += (r[a] - mu[a]) * (r[b] - mu[b]) / (W - 1);
      for (let a = 0; a < N; a++) for (let b = 0; b < a; b++) S[a][b] = S[b][a];
      const dv = x.map((v, q) => v - mu[q]);
      const y = solve(S, dv);
      if (y) {
        let d = 0;
        for (let q = 0; q < N; q++) d += dv[q] * y[q];
        const prior = st.d.slice(-p.histWindow);
        if (prior.length >= p.histWindow) {
          const srt = [...prior].sort((u, v) => u - v);
          const thr = srt[Math.ceil(p.pct * srt.length) - 1];
          if (d > thr) st.counter = p.offDays;
        }
        st.d.push(d);
      }
    }
  }
  if (st.counter > 0) { st.counter--; return universe.SHY ? { SHY: 1 } : {}; }
  if (!universe.QQQ || !universe.DIA) return {};
  return { QQQ: 0.5, DIA: 0.5 };
}
