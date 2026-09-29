export const meta = {
  id: "breadth-ctrl-above200-always",
  name: "Control: always hold the above-200dma names, equal weight, weekly",
  family: "breadth",
  source: "matched naive control for breadth timing (hunt lane terra-5, 2026-09-22)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "weekly",
  params: { smaWindow: 200, minBars: 200 },
};

export function rank(universe, t, ctx) {
  const participating = [];
  let eligible = 0;

  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < 200) continue;
    eligible++;
    let sum = 0;
    for (let i = b.length - 200; i < b.length; i++) sum += b[i].close;
    const sma200 = sum / 200;
    if (b[b.length - 1].close > sma200) participating.push(sym);
  }

  const above = participating.length;
  const breadth = eligible === 0 ? 0 : above / eligible;
  if (above === 0) return {};

  const weights = {};
  for (const sym of participating) weights[sym] = 1 / above;
  return weights;
}
