export const meta = {
  "id": "s29-us-supply-chain-leadlag",
  "name": "Semiconductors lead downstream tech (supply-chain lead-lag)",
  "family": "momentum",
  "source": "Menzly & Ozbas 2010 JF ('Market segmentation and cross-predictability of returns'); Cohen & Frazzini 2008 JF (economic links)",
  "assetClass": "us_stock",
  "timeframe": "1d",
  "universe": "US_STOCKS_DAILY",
  "rebalance": "weekly",
  "params": {
    "lookback": 5,
    "gap": 0.02
  }
};

export function rank(universe, t, ctx) {
  const up = ["NVDA","AMD","AVGO","QCOM","TXN","INTC"], dn = ["AAPL","AMZN","GOOGL","META","ORCL","ADBE","CRM","NFLX"];
  const L = ctx.params.lookback;
  const mean = (syms) => {
    let s = 0, n = 0;
    for (const k of syms) {
      const b = universe[k];
      if (!b || b.length < L + 1) continue;
      s += b[b.length - 1].close / b[b.length - 1 - L].close - 1; n++;
    }
    return n ? s / n : null;
  };
  const u = mean(up), d = mean(dn);
  if (u === null || d === null || u - d < ctx.params.gap) return {};
  const held = dn.filter((k) => universe[k] && universe[k].length >= L + 1);
  const w = {};
  for (const k of held) w[k] = 1 / held.length;
  return w;
}
