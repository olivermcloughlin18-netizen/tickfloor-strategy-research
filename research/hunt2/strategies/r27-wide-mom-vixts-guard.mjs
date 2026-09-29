// Wide-universe 12-1 momentum top-N book, gated to cash-like EW whenever VIX term
// structure is in backwardation (VIX/VIX3M >= 1.0), the panic-state signature of
// momentum crashes.
// Source: Daniel & Moskowitz 2016 JFE 'Momentum crashes' (crashes come in panic
// states with high volatility); Barroso & Santa-Clara 2015 JFE; Simon & Campasano 2014.
export const meta = {
  id: "r27-wide-mom-vixts-guard",
  name: "12-1 momentum, equal weight while the VIX curve is inverted (wide US stocks)",
  family: "momentum",
  source: "Daniel & Moskowitz 2016 JFE 'Momentum crashes' (crashes come in panic states with high volatility); Barroso & Santa-Clara 2015 JFE; Simon & Campasano 2014",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "daily",
  params: { lag: 2, need: 254, ratioMax: 1.0 },
};

export function rank(universe, t, ctx) {
  const need = ctx.params.need;
  const syms = Object.keys(universe).sort();

  // -- eligibility + 12-1 momentum, on bars up to the session before the rebalance --
  const scores = [];
  for (const sym of syms) {
    const b = universe[sym];
    const L = b.length;
    if (L < need) continue;
    const e = L - 2;
    const pNow = b[e - 21].close;
    const pThen = b[e - 252].close;
    if (!Number.isFinite(pNow) || !Number.isFinite(pThen) || pThen === 0) continue;
    const mom = pNow / pThen - 1;
    if (!Number.isFinite(mom)) continue;
    scores.push({ sym, mom });
  }
  const M = scores.length;

  // -- first call of each calendar month: rebuild the book --
  const d = new Date(t * 1000);
  const monthKey = d.getUTCFullYear() * 12 + d.getUTCMonth();
  if (ctx.state.monthKey === undefined || monthKey !== ctx.state.monthKey) {
    ctx.state.monthKey = monthKey;
    if (M < 50) {
      ctx.state.book = [];
    } else {
      const N = Math.max(10, Math.round(0.2 * M));
      scores.sort((a, b) => (b.mom - a.mom) || (a.sym < b.sym ? -1 : a.sym > b.sym ? 1 : 0));
      ctx.state.book = scores.slice(0, N).map((s) => s.sym);
    }
  }

  const ewPresent = () => {
    const w = {};
    if (syms.length === 0) return w;
    const wt = 1 / syms.length;
    for (const s of syms) w[s] = wt;
    return w;
  };

  const v = ctx.macro("VIX");
  const v3 = ctx.macro("VIX3M");
  const stress = v !== null && v3 !== null && v3 > 0 && v / v3 >= ctx.params.ratioMax;

  const book = ctx.state.book;
  if (stress || book.length === 0) return ewPresent();

  const present = book.filter((s) => universe[s] !== undefined);
  if (present.length === 0) return ewPresent();

  const w = {};
  const wt = 1 / present.length;
  for (const s of present) w[s] = wt;
  return w;
}
