export const meta = {
  "id": "s29-etf-credit-duration-vix",
  "name": "Credit in calm markets, duration when VIX is elevated",
  "family": "volatility",
  "source": "Connolly, Stivers & Sun 2005 JFQA (stock market uncertainty and the stock-bond relation); Baele et al. 2020 RFS",
  "assetClass": "etf",
  "timeframe": "1d",
  "universe": "ETFS_DAILY",
  "rebalance": "weekly",
  "params": {
    "vix": 22
  }
};

export function rank(universe, t, ctx) {
  const v = ctx.macro("VIX");
  if (v !== null && v >= ctx.params.vix) return (!universe.TLT || !universe.IEF) ? {} : { TLT: 0.5, IEF: 0.5 };
  if (!universe.HYG || !universe.LQD) return {}; // ponytail: credit ETFs not yet trading
  return { HYG: 0.5, LQD: 0.5 };
}
