// BTC dominance trend as altcoin risk-on rotation signal
// Source: common crypto-market "altseason" heuristic (BTC.D falling -> capital rotates into alts).
// STAND-IN NOTE: the harness has no market-cap or circulating-supply data, so true BTC.D (BTC
// market cap / total market cap) cannot be computed. Stand-in: BTC's trailing 4-week return minus
// the equal-weight return of the other 17 discovery alts. A falling value (BTC underperforming
// alts) stands in for falling dominance. This is a declared methodological substitution, not the
// README's INDEX_PROXY rule (which is only for SPY/IWM/EFA).
// Rule: if the 4-week dominance stand-in has fallen vs 4 weeks ago -> equal-weight the top-4
// alts by 4-week momentum; otherwise hold BTC only. Rebalanced weekly.

export const meta = {
  id: "macro-crypto-btc-dominance-altseason-rotation__rob1",
  name: "BTC dominance trend (price-based stand-in) as altcoin risk-on rotation signal (-25%)",
  family: "macro-intermarket",
  source: "common crypto-market altseason heuristic (BTC.D rotation)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "weekly",
  params: { lookbackDays: 21, topN: 4 },
};

const BTC = "BTCUSDT";

function retN(bars, n) {
  if (bars.length <= n) return null;
  const last = bars[bars.length - 1].close;
  const past = bars[bars.length - 1 - n].close;
  if (past <= 0) return null;
  return last / past - 1;
}

export function rank(universe, t, ctx) {
  const n = ctx.params.lookbackDays;
  const btcBars = universe[BTC];
  if (!btcBars) return {};
  const btcRet = retN(btcBars, n);

  const alts = Object.keys(universe).filter((s) => s !== BTC);
  const altRets = [];
  for (const sym of alts) {
    const r = retN(universe[sym], n);
    if (r !== null) altRets.push(r);
  }
  if (btcRet === null || altRets.length === 0) return { [BTC]: 1 };
  const altAvg = altRets.reduce((a, b) => a + b, 0) / altRets.length;
  const domProxyNow = btcRet - altAvg;

  if (ctx.state.hist === undefined) ctx.state.hist = [];
  const hist = ctx.state.hist;
  hist.push(domProxyNow);
  if (hist.length > 6) hist.shift();

  let falling = false;
  if (hist.length > 4) {
    falling = domProxyNow < hist[hist.length - 1 - 4];
  }

  if (!falling) return { [BTC]: 1 };

  // dominance falling -> rotate into top-N alts by momentum
  const scored = [];
  for (const sym of alts) {
    const r = retN(universe[sym], n);
    if (r !== null) scored.push([sym, r]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  const top = scored.slice(0, ctx.params.topN);
  if (top.length === 0) return { [BTC]: 1 };
  const w = {};
  for (const [sym] of top) w[sym] = 1 / top.length;
  return w;
}
