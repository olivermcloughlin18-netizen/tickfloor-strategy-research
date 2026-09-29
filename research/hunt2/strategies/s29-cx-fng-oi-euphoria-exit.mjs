export const meta = {
  id: "s29-cx-fng-oi-euphoria-exit",
  name: "Trend with an exit when greed and record open interest coincide",
  family: "sentiment",
  source: "Baker & Wurgler 2006 (sentiment peaks); Adrian & Shin 2010 (leverage peaks); crypto desk 'euphoria + OI ATH' warnings",
  assetClass: "crypto",
  timeframe: "1d",
  assets: ["BTCUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","LTCUSDT","LINKUSDT","TRXUSDT"],
  params: { sma: 50, greed: 75, oiWindow: 90, flatBars: 5 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.eu === undefined) ctx.state.eu = [];
  const eu = ctx.state.eu;
  // euphoria at bar i (eu[i]: 1 yes, 0 no, -1 not computable)
  let e = -1;
  const oi = ctx.openInterest(i);
  const f = ctx.macro("FNG", i);
  if (i >= p.oiWindow && oi != null && f != null) {
    let ok = true, mx = -Infinity;
    for (let k = i - p.oiWindow; k < i; k++) {
      const v = ctx.openInterest(k);
      if (v == null) { ok = false; break; }
      if (v > mx) mx = v;
    }
    if (ok) e = (f >= p.greed && oi >= mx) ? 1 : 0;
  }
  eu[i] = e;
  if (e < 0) return 0; // warm-up needs 91 non-null OI values
  for (let j = Math.max(0, i - p.flatBars + 1); j <= i; j++) if (eu[j] === 1) return 0;
  const s = ctx.sma("close", p.sma, i);
  return bars[i].close > s ? 1 : 0;
}
