export const meta = {
  id: "s29-cx-stress-resilience",
  name: "Buy the alts that held up best on a BTC crash day",
  family: "momentum",
  source: "O'Neil 1988 'How to Make Money in Stocks' (relative strength in market corrections); Ang, Chen & Xing 2006 (downside risk)",
  assetClass: "crypto",
  timeframe: "1d",
  assets: [
    "BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT",
    "LINKUSDT", "TRXUSDT", "BCHUSDT", "ATOMUSDT", "ETCUSDT", "DASHUSDT",
    "ZECUSDT", "AVAXUSDT", "UNIUSDT", "NEARUSDT", "AAVEUSDT", "HBARUSDT",
  ],
  longShort: false,
  rebalance: "daily",
  params: { btcDrop: -0.05, top: 4, holdDays: 7, minBars: 30 },
};

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const state = ctx.state;
  if (state.counter === undefined) {
    state.counter = 0;
    state.names = [];
  }

  const btc = universe.BTCUSDT;
  if (btc && btc.length >= 2) {
    const n = btc.length;
    const btcReturn = btc[n - 1].close / btc[n - 2].close - 1;
    if (btcReturn <= p.btcDrop) {
      const scores = [];
      for (const sym of Object.keys(universe)) {
        if (sym === "BTCUSDT") continue;
        const bars = universe[sym];
        if (bars.length < p.minBars) continue;
        const m = bars.length;
        scores.push([sym, bars[m - 1].close / bars[m - 2].close - 1]);
      }
      scores.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      state.names = scores.slice(0, p.top).map(([sym]) => sym);
      state.counter = p.holdDays;
    }
  }

  if (state.counter <= 0 || state.names.length === 0) return {};
  const held = state.names.filter((sym) => universe[sym]);
  state.counter--;
  if (held.length === 0) return {};
  const weights = {};
  for (const sym of held) weights[sym] = 1 / held.length;
  return weights;
}
