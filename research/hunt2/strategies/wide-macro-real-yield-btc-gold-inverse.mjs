// 10Y real yield (TIPS) inverse regime for BTC (gold leg omitted, see note)
// Source: standard "real yields down -> non-yielding hard assets (gold, BTC) up" macro heuristic.
// SCOPE NOTE: the catalogue rule allocates between BTC and gold. A strategy file here has one
// assetClass/universe (crypto | us_stock | etf), so BTC and GLD cannot sit in the same rank()
// universe. This tests only the BTC leg of the rule: DFII10 falling over the trailing 4 weeks ->
// full BTC exposure; DFII10 rising -> flat. The gold leg is untested and left for a separate
// etf-assetClass strategy if a future agent wants it.
// Rule: signal mode, single asset (BTCUSDT).

export const meta = {
  id: "wide-macro-real-yield-btc-gold-inverse",
  name: "10Y real yield (TIPS) inverse regime for BTC (gold leg omitted) (wide US stocks)",
  family: "macro-intermarket",
  source: "standard real-yield / hard-asset macro heuristic (e.g. Fed real-rate discussions of gold/BTC)",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  params: { lookbackDays: 28 },
};

export function signal(bars, i, ctx) {
  const n = ctx.params.lookbackDays;
  if (i < n) return 0;
  const now = ctx.macro("DFII10", i);
  const past = ctx.macro("DFII10", i - n);
  if (now === null || past === null) return 0;
  return now < past ? 1 : 0;
}
