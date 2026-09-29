export const meta = {
  id: "s29-etf-market-illiquidity",
  name: "Buy after a market illiquidity spike (Amihud time-series premium)",
  family: "other",
  source: "Amihud 2002 J. Financial Markets (expected market illiquidity raises expected returns)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "DIA", "XLK", "XLF", "XLI", "XLY", "XLV"],
  params: { window: 21, base: 252, mult: 1.5, holdBars: 21 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  const s = ctx.state;
  if (s.roll === undefined) { s.roll = ctx.rolling(p.window); s.A = []; s.hold = 0; }
  if (i === 0) return 0;
  const b = bars[i];
  const dv = b.close * b.volume;
  const ret = b.close / bars[i - 1].close - 1;
  s.roll.push(dv > 0 ? (Math.abs(ret) / dv) * 1e9 : 0);
  if (!s.roll.full()) return 0;
  const a = s.roll.mean();
  let sig = false;
  if (s.A.length >= p.base + 1) {
    const prev = s.A.slice(s.A.length - p.base).sort((x, y) => x - y);
    const med = (prev[p.base / 2 - 1] + prev[p.base / 2]) / 2;
    sig = a >= p.mult * med;
  }
  s.A.push(a);
  if (s.hold > 0) { s.hold--; return s.hold >= 0 && s.hold < p.holdBars ? 1 : 0; }
  if (sig) { s.hold = p.holdBars - 1; return 1; }
  return 0;
}
