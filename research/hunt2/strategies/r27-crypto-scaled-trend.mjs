// prereg r27-crypto-scaled-trend (C2, RISK_IMPROVER track). Graded multi-horizon trend
// exposure: each coin's weight scales with how many of {20,50,100}-session SMAs its close
// beats (0, 1/3, 2/3 or 1), split evenly across present coins. Warm-up coins (< need bars)
// held like buy-and-hold. Unallocated weight is cash.
export const meta = {
  id: "r27-crypto-scaled-trend",
  name: "Crypto trend exposure scaled in over 20/50/100-day averages",
  family: "trend",
  source: "u/IndependentCause9435, r/ASX_Bets 1wo5lrs (split an entry into several smaller orders); Hurst, Ooi & Pedersen 2017 (graded multi-horizon trend positions); Zarattini, Pagani & Barbon 2025",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "daily",
  params: { lag: 2, windows: [20, 50, 100], need: 102 },
};

// rank() mode only exposes ctx.macro / ctx.resample / ctx.rolling (per README) — sma/ema/rsi
// aren't bound to arbitrary universe[sym] arrays here, so windows are summed by hand.
export function rank(universe, t, ctx) {
  const { lag, windows, need } = ctx.params;
  const syms = Object.keys(universe);
  const n = syms.length;
  if (n === 0) return {};

  const weights = {};
  for (const sym of syms) {
    const b = universe[sym];
    const L = b.length;
    if (L < need) { weights[sym] = 1 / n; continue; } // warm-up: held like buy-and-hold
    const e = L - lag;
    const c = b[e].close;
    let eligible = Number.isFinite(c);
    let k = 0;
    for (const w of windows) {
      if (!eligible) break;
      let sum = 0;
      for (let j = e - w + 1; j <= e; j++) {
        const v = b[j].close;
        if (!Number.isFinite(v)) { eligible = false; break; }
        sum += v;
      }
      if (!eligible) break;
      if (c > sum / w) k++;
    }
    weights[sym] = eligible ? (k / windows.length) / n : 1 / n;
  }
  return weights;
}
