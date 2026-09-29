export const meta = {
  id: "sol-credit-leads-vol-repair",
  name: "Credit ETF repair during sustained VIX inversion",
  family: "credit-vol-disagreement",
  source: "https://www.nber.org/papers/w17021",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["HYG", "XLK", "LQD", "SHY"],
  rebalance: "daily",
  longShort: false,
  params: {
    minInversionDays: 5,
    creditLookbackDays: 10,
    minRatioRise: 0.02,
    holdDays: 10,
    assetWarmupBars: 64,
  },
};

const ASSETS = ["HYG", "XLK", "LQD", "SHY"];

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const s = ctx.state;
  const baseline = { HYG: 0.25, XLK: 0.25, LQD: 0.25, SHY: 0.25 };

  if (!ASSETS.every((asset) => universe[asset] && universe[asset].length >= p.assetWarmupBars)) return baseline;
  if (s.hold === undefined) { s.hold = 0; s.previous = false; s.inversionDays = 0; }

  const vix = ctx.macro("VIX");
  const vix3m = ctx.macro("VIX3M");
  const inverted = vix !== null && vix3m !== null && Number.isFinite(vix) && Number.isFinite(vix3m) && vix >= vix3m;
  s.inversionDays = inverted ? s.inversionDays + 1 : 0;

  const hyg = universe.HYG;
  const lqd = universe.LQD;
  const n = p.creditLookbackDays;
  const ratioNow = hyg[hyg.length - 1].close / lqd[lqd.length - 1].close;
  const ratioThen = hyg[hyg.length - 1 - n].close / lqd[lqd.length - 1 - n].close;
  const predicate = s.inversionDays >= p.minInversionDays && ratioNow / ratioThen - 1 >= p.minRatioRise;
  const trigger = s.hold === 0 && predicate && !s.previous;
  s.previous = predicate;

  if (trigger) s.hold = p.holdDays;
  if (s.hold === 0) return baseline;
  s.hold--;
  return { HYG: 0.5, XLK: 0.5 };
}
