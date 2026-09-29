export const meta = {
  id: "s29-us-llorente-volume-return",
  name: "Volume-return dynamics: continuation where trading is informed",
  family: "momentum",
  source: "Llorente, Michaely, Saar & Wang 2002 RFS ('Dynamic volume-return relation of individual stocks')",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_DAILY",
  rebalance: "weekly",
  params: { detrend: 200, window: 250, recent: 5, top: 8 },
};

// solve 3x3 normal equations by Gaussian elimination
function solve3(A, y) {
  const M = A.map((r, i) => [...r, y[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-18) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k];
    }
  }
  return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
}

export function rank(universe, t, ctx) {
  const { detrend: D, window: W, recent: R, top } = ctx.params;
  const scores = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym], L = b.length, T = L - 1;
    if (L < 452) continue;
    const lv = b.map((x) => Math.log(x.volume));
    if (!lv.slice(T - W - D).every(Number.isFinite)) continue;
    const r = (k) => b[k].close / b[k - 1].close - 1;
    // v(k) for k in [T-W+1-? .. T]; pairs (k, k+1) for k = T-249..T-1
    const vAt = (k) => {
      let s = 0;
      for (let j = k - D + 1; j <= k; j++) s += lv[j];
      return lv[k] - s / D;
    };
    const XtX = [[0,0,0],[0,0,0],[0,0,0]], Xty = [0,0,0];
    for (let k = T - (W - 1); k <= T - 1; k++) {
      const rk = r(k), x = [1, rk, vAt(k) * rk], y = r(k + 1);
      for (let a = 0; a < 3; a++) {
        Xty[a] += x[a] * y;
        for (let c = 0; c < 3; c++) XtX[a][c] += x[a] * x[c];
      }
    }
    const beta = solve3(XtX, Xty);
    if (!beta) continue;
    let s = 0;
    for (let k = T - R + 1; k <= T; k++) s += vAt(k) * r(k);
    scores.push([sym, beta[2] * s]);
  }
  scores.sort((x, y) => y[1] - x[1]);
  const w = {};
  for (const [s] of scores.slice(0, top)) w[s] = 1 / top;
  return w;
}
