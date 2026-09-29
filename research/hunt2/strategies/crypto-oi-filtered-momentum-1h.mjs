// Open-interest-filtered momentum: 24h price momentum, taken only when
// open interest has also grown over the same window (OI growth as a
// conviction/participation filter, not just price moving on thin OI).
// RESEARCH.md §4: "open interest / positioning / taker flow — fetched,
// never tested." This is the first test of that family.
export const meta = {
  id: "crypto-oi-filtered-momentum-1h",
  name: "24h momentum filtered by rising open interest",
  family: "trend-managed-futures",
  source: "OI-confirmed momentum, crypto derivatives-desk heuristic (2022-2024 practitioner writeups)",
  assetClass: "crypto",
  timeframe: "1h",
  longShort: true,
  params: { lookbackHours: 24 },
};

export function signal(bars, i, ctx) {
  const n = ctx.params.lookbackHours;
  if (i < n) return 0;
  const oiNow = ctx.openInterest(i);
  const oiPast = ctx.openInterest(i - n);
  if (oiNow === null || oiPast === null) return 0; // fails closed: no OI data -> no trade
  const momentum = bars[i].close / bars[i - n].close - 1;
  const oiGrowing = oiNow > oiPast;
  if (!oiGrowing) return 0;
  if (momentum > 0) return 1;
  if (momentum < 0) return -1;
  return 0;
}
