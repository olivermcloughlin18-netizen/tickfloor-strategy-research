// Sector rotation into defensive ETFs (staples/utilities/health care) gated by VIX term-structure
// stress (backwardation, VIX/VIX3M >= 1.0), else equal-weight across the sector+REIT universe.
// Source: Simon & Campasano 2014 J. Derivatives (VIX futures basis); Johnson 2017 JFQA (VIX term
// structure and risk premia); Baele, Bekaert, Inghelbrecht & Wei 2020 RFS (flights to safety).
export const meta = {
  id: "r27-sector-vixts-defensive",
  name: "Defensive sectors while the VIX curve is inverted",
  family: "volatility",
  source: "Simon & Campasano 2014 J. Derivatives; Johnson 2017 JFQA; Baele, Bekaert, Inghelbrecht & Wei 2020 RFS (flights to safety)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLC", "VNQ"],
  rebalance: "daily",
  params: { ratioMax: 1.0 },
};

const DEFENSIVE = ["XLP", "XLU", "XLV"];

export function rank(universe, t, ctx) {
  const syms = Object.keys(universe).sort();
  const w = {};

  const v = ctx.macro("VIX");
  const v3 = ctx.macro("VIX3M");
  const stress = v !== null && v3 !== null && v3 > 0 && v / v3 >= ctx.params.ratioMax;

  if (stress) {
    const present = DEFENSIVE.filter((s) => syms.includes(s));
    if (present.length > 0) {
      const wt = 1 / present.length;
      for (const s of present) w[s] = wt;
      return w;
    }
    // none of the defensives present today -> EW present
  }

  const wt = 1 / syms.length;
  for (const s of syms) w[s] = wt;
  return w;
}
