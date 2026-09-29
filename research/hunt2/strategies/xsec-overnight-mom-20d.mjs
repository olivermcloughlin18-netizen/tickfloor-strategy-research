// Hypothesis: the OVERNIGHT (close-to-open) component of a stock's past 20 days carries
// cross-sectional momentum information about its NEXT close-to-close return that the full-day
// return does not. Lou, Polk & Skouras (2019 JFE) "A tug of war: overnight versus intraday
// expected returns": momentum lives overnight, reversal lives intraday.
// Matched control: xsec-totalret-mom-20d (identical file, close-to-close score instead).
export const meta = {
  id: "xsec-overnight-mom-20d",
  name: "Cross-sectional 20-day OVERNIGHT-return momentum (close-to-open component only)",
  family: "momentum",
  source: "Lou, Polk & Skouras (2019), 'A tug of war: Overnight versus intraday expected returns', JFE 134(1). Not in research/hunt2/catalogue.json.",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "weekly",
  longShort: true,
  params: { lookback: 20, nSide: 15, minValid: 20 },
};

export function rank(universe, t, ctx) {
  const L = ctx.params.lookback;
  const scores = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < L + 1) continue;
    let s = 0, ok = true;
    for (let j = b.length - 1; j >= b.length - L; j--) {
      const o = b[j].open, pc = b[j - 1].close;
      if (!(o > 0) || !(pc > 0)) { ok = false; break; }
      s += Math.log(o / pc); // overnight (close-to-open) log return
    }
    if (ok && Number.isFinite(s)) scores.push([sym, s]);
  }
  if (scores.length < ctx.params.minValid) return {};
  scores.sort((x, y) => y[1] - x[1]);
  const n = Math.min(ctx.params.nSide, Math.floor(scores.length / 2));
  const w = 1 / (2 * n);
  const out = {};
  for (let k = 0; k < n; k++) out[scores[k][0]] = w;                        // long high overnight
  for (let k = 0; k < n; k++) out[scores[scores.length - 1 - k][0]] = -w;   // short low overnight
  return out;
}
