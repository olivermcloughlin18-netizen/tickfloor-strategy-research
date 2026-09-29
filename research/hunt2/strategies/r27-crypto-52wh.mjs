// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "r27-crypto-52wh",
  name: "Crypto nearness to the 365-day high",
  family: "momentum",
  source: "George & Hwang 2004 JF (52-week-high momentum); Li & Yu 2012 JFE (anchoring on the 52-week high). Weak prior: no crypto evidence known.",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "weekly",
  params: { lag: 2, window: 365, need: 367, minNames: 8, frac: 0.3 },
};

// PORTFOLIO strategy (cross-sectional): rank(universe, t, ctx).
// universe[SYMBOL] = bars up to and including date t, for every asset that traded on t.
// Return weights {SYMBOL: weight}; weights >= 0, sum to 1 unless the rule allows cash.
export function rank(universe, t, ctx) {
  const syms = Object.keys(universe);
  const n = syms.length;
  const ew = () => {
    const w = {};
    for (const sym of syms) w[sym] = 1 / n;
    return w;
  };

  const { lag, window, need, minNames, frac } = ctx.params;
  const scored = [];
  for (const sym of syms) {
    const b = universe[sym];
    const L = b.length;
    if (L < need) continue;
    const e = L - lag; // signals use bars up to the session before the rebalance session

    let maxHigh = -Infinity;
    let finite = true;
    for (let k = e - window + 1; k <= e; k++) {
      const h = b[k].high;
      if (!Number.isFinite(h)) { finite = false; break; }
      if (h > maxHigh) maxHigh = h;
    }
    const close = b[e].close;
    if (!finite || !Number.isFinite(close)) continue;

    scored.push([sym, close / maxHigh]);
  }

  const M = scored.length;
  if (M < minNames) return ew(); // too few eligible names -> EW present

  scored.sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)); // score desc, ties symbol asc
  const K = Math.max(3, Math.round(frac * M));
  const top = scored.slice(0, K);
  const w = {};
  for (const [sym] of top) w[sym] = 1 / top.length;
  return w;
}
