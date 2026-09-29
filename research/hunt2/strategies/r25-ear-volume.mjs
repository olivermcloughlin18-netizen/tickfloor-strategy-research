// prereg-2026-09-25 B3: earnings-announcement-return drift with a volume proxy for the event.
// Event = the session in [e-62, e-1] with the highest volume / prior-50-session median (>= 3x).
// EAR = return from close k-2 to close k+1 minus the equal-weight universe's return over the
// same sessions. Hold the N highest EAR among names with an event (>= 10 needed).
export const meta = {
  id: "r25-ear-volume",
  name: "Earnings-announcement-return drift, volume-identified events (wide US stocks)",
  family: "event-driven",
  source: "Chan, Jegadeesh & Lakonishok 1996 JF (momentum strategies; announcement-return drift); Brandt, Kishore, Santa-Clara & Venkatachalam 2008",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 116, lag: 2, minNames: 50, from: 62, base: 50, volX: 3, minHold: 10 },
};

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}
function order(rows, desc) {
  return rows.sort((a, b) => (desc ? b[1] - a[1] : a[1] - b[1]) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}
function median(xs) {
  const s = xs.slice().sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}

export function rank(universe, t, ctx) {
  const { need, lag, minNames, from, base, volX, minHold } = ctx.params;
  const elig = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length >= need) elig.push([sym, b, b.length - lag]);
  }
  if (elig.length < minNames) return ew(universe);
  const mkt = new Map();
  const mktRet = (d) => {
    if (!mkt.has(d)) {
      let s = 0;
      for (const [, b, e] of elig) s += b[e - d + 1].close / b[e - d - 2].close - 1;
      mkt.set(d, s / elig.length);
    }
    return mkt.get(d);
  };
  const rows = [];
  for (const [sym, b, e] of elig) {
    let best = -1;
    let bestAV = 0;
    for (let k = e - from; k <= e - 1; k++) {
      const vols = [];
      for (let j = k - base; j < k; j++) vols.push(b[j].volume);
      const med = median(vols);
      if (!(med > 0)) continue;
      const av = b[k].volume / med;
      if (av >= bestAV) {
        bestAV = av;
        best = k;
      }
    }
    if (best < 0 || bestAV < volX) continue;
    const ear = b[best + 1].close / b[best - 2].close - 1 - mktRet(e - best);
    if (Number.isFinite(ear)) rows.push([sym, ear]);
  }
  if (rows.length < minHold) return ew(universe);
  const N = Math.min(rows.length, Math.max(10, Math.round(0.2 * elig.length)));
  const out = {};
  for (const [sym] of order(rows, true).slice(0, N)) out[sym] = 1 / N;
  return out;
}
