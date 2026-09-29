export const meta = {
  id: "s29-cx-btc-leadlag-alts",
  name: "Alts that lag a big BTC up-day catch up",
  family: "momentum",
  source: "Sifat, Mohamad & Shariff 2019 RIBAF (lead-lag between Bitcoin and altcoins); Hou 2007 RFS (gradual diffusion lead-lag)",
  assetClass: "crypto",
  timeframe: "1d",
  assets: [
    "BTCUSDT",
    "BNBUSDT",
    "XRPUSDT",
    "ADAUSDT",
    "DOGEUSDT",
    "LTCUSDT",
    "LINKUSDT",
    "TRXUSDT",
    "BCHUSDT",
    "ATOMUSDT",
    "ETCUSDT",
    "DASHUSDT",
    "ZECUSDT",
    "AVAXUSDT",
    "UNIUSDT",
    "NEARUSDT",
    "AAVEUSDT",
    "HBARUSDT",
  ],
  rebalance: "daily",
  longShort: false,
  params: { btcUp: 0.03, lag: 0.02 },
};

export function rank(universe, t, ctx) {
  const btc = universe.BTCUSDT;
  if (!btc || btc.length < 2) return {};
  const btcReturn = btc[btc.length - 1].close / btc[btc.length - 2].close - 1;
  if (btcReturn < ctx.params.btcUp) return {};

  const selected = [];
  for (const symbol of meta.assets) {
    if (symbol === "BTCUSDT") continue;
    const bars = universe[symbol];
    if (!bars || bars.length < 2) continue;
    const assetReturn = bars[bars.length - 1].close / bars[bars.length - 2].close - 1;
    if (assetReturn <= btcReturn - ctx.params.lag) selected.push(symbol);
  }

  const weights = {};
  for (const symbol of selected) weights[symbol] = 1 / selected.length;
  return weights;
}
