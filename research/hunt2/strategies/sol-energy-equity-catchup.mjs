export const meta = {
  id: "sol-energy-equity-catchup",
  name: "Energy ETF catch-up to known WTI rise",
  family: "oil-shock-attribution",
  source: "https://onlinelibrary.wiley.com/doi/full/10.1111/fima.12396",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLE", "XLB", "XLI", "XLP", "XLY", "XLV"],
  rebalance: "daily",
  longShort: false,
  params: { lookbackDays: 21, minOilReturn: 0.1, holdDays: 21, assetWarmupBars: 64 },
};

const ASSETS = ["XLE", "XLB", "XLI", "XLP", "XLY", "XLV"];

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const s = ctx.state;
  if (s.oil === undefined) { s.oil = []; s.hold = 0; s.previous = false; }

  const baseline = {};
  const available = ASSETS.filter((asset) => universe[asset]);
  for (const asset of available) baseline[asset] = 1 / available.length;

  const oil = ctx.macro("DCOILWTICO");
  if (oil !== null) {
    s.oil.push(oil);
    if (s.oil.length > p.lookbackDays + 1) s.oil.shift();
  }

  if (!ASSETS.every((asset) => universe[asset] && universe[asset].length >= p.assetWarmupBars)) return baseline;
  if (s.oil.length < p.lookbackDays + 1) return baseline;

  const returns = ASSETS.map((asset) => {
    const bars = universe[asset];
    return bars[bars.length - 1].close / bars[bars.length - 1 - p.lookbackDays].close - 1;
  });
  const sorted = returns.slice().sort((a, b) => a - b);
  const median = (sorted[2] + sorted[3]) / 2;
  const predicate = s.oil[s.oil.length - 1] / s.oil[0] - 1 >= p.minOilReturn && returns[0] < median;
  const trigger = s.hold === 0 && predicate && !s.previous;
  s.previous = predicate;

  if (trigger) s.hold = p.holdDays;
  if (s.hold === 0) return baseline;
  s.hold--;
  return { XLE: 1 };
}
