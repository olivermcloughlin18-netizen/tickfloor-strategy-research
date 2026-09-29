export const meta = {
  id: "s29-etf-vix-flight-safe-haven",
  name: "Gold and Treasuries after a VIX spike (flight to safety)",
  family: "other",
  source: "Baur & Lucey 2010 Financial Review (gold as a short-term safe haven); Baele, Bekaert, Inghelbrecht & Wei 2020 RFS ('Flights to safety')",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["GLD", "TLT", "IEF"],
  holdBars: 15,
  params: { lag: 5, jump: 1.3, holdBars: 15 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (i < p.lag) return 0;
  const a = ctx.macro("VIX", i), b = ctx.macro("VIX", i - p.lag);
  if (a === null || b === null) return 0;
  return a >= p.jump * b ? 1 : 0;
}
