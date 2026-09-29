// prereg C4 volatility: near-miss follow-up of r25-qqq-agg-volmanaged (p = 6.2e-4), whose
// gain came largely from a standing QQQ overweight against the 50/50 benchmark. Centring the
// weight on 0.5 here isolates the timing: scale QQQ's weight by how its trailing realised
// variance compares to its own trailing-median variance, staying at 50/50 until enough
// history has built up.
export const meta = {
  id: "r27-qqq-agg-volneutral",
  name: "QQQ/AGG volatility timing centred on 50/50",
  family: "volatility",
  source:
    "Moreira & Muir 2017 JF (volatility-managed portfolios); Cederburg, O'Doherty, Wang & Yan 2020 JFE (out-of-sample doubts). Near-miss follow-up of r25-qqq-agg-volmanaged (p = 6.2e-4), whose gain came largely from a standing QQQ overweight against the 50/50 benchmark; centring the weight on 0.5 isolates the timing. A new test.",
  assetClass: "etf",
  assets: ["QQQ", "AGG"],
  rebalance: "monthly",
  timeframe: "1d",
  params: { lag: 2, window: 21, minHistory: 36 },
};

function ew(u) {
  const syms = Object.keys(u);
  const w = {};
  for (const s of syms) w[s] = 1 / syms.length;
  return w;
}

function median(arr) {
  const s = arr.slice().sort((a, b) => a - b);
  const n = s.length;
  const mid = n >> 1;
  return n % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function rank(universe, t, ctx) {
  const { lag, window, minHistory } = ctx.params;
  if (!universe.QQQ || !universe.AGG) return ew(universe);

  const b = universe.QQQ;
  const L = b.length;
  const e = L - lag;
  if (L < window + lag) return { QQQ: 0.5, AGG: 0.5 };

  // r(k) = close[k]/close[k-1] - 1 for k = e-window+1 .. e, then sample variance * 252.
  const rets = [];
  for (let k = e - window + 1; k <= e; k++) {
    const r = b[k].close / b[k - 1].close - 1;
    if (!Number.isFinite(r)) return { QQQ: 0.5, AGG: 0.5 };
    rets.push(r);
  }
  const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
  const sampleVar = rets.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (rets.length - 1);
  const v = sampleVar * 252;

  if (ctx.state.H === undefined) ctx.state.H = [];
  ctx.state.H.push(v);

  if (ctx.state.H.length < minHistory) return { QQQ: 0.5, AGG: 0.5 };

  const m = median(ctx.state.H);
  const w = Math.min(1, Math.max(0, (0.5 * m) / v));
  return { QQQ: w, AGG: 1 - w };
}
