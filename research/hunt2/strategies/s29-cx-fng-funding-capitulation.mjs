export const meta = {
  id: "s29-cx-fng-funding-capitulation",
  name: "Double capitulation: extreme fear plus negative funding",
  family: "sentiment",
  source: "alternative.me Fear & Greed; Schmeling, Schrimpf & Todorov 2023 (negative funding = short crowding); contrarian-sentiment literature (Baker & Wurgler 2006)",
  assetClass: "crypto",
  timeframe: "1d",
  assets: [
    "BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT",
    "LINKUSDT", "TRXUSDT", "BCHUSDT", "ATOMUSDT", "ETCUSDT", "DASHUSDT",
    "ZECUSDT", "AVAXUSDT", "UNIUSDT", "NEARUSDT", "AAVEUSDT", "HBARUSDT",
  ],
  longShort: false,
  holdBars: 14,
  params: { fearMax: 20, fundingMax: 0, holdBars: 14 },
};

export function signal(bars, i, ctx) {
  const fear = ctx.macro("FNG", i) ?? 0;
  const funding = ctx.fundingRate(i) ?? 0;
  return fear <= ctx.params.fearMax && funding < ctx.params.fundingMax ? 1 : 0;
}
