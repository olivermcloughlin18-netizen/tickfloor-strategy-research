// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "r27-crypto-boom-only__rob1",
  name: "Crypto alts only in BTC booms, else BTC only (-25%)",
  family: "trend",
  source: "u/ImNotSelling, r/Trading 1wop3th (specialise in one condition, 'only trading booms'); Liu & Tsyvinski 2021 RFS (BTC time-series momentum); Liu, Tsyvinski & Wu 2022 JF (alts load more than 1 on the crypto market factor)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "weekly",
  params: { lag: 2, lookback: 21, need: 23 },
};

// PORTFOLIO strategy (cross-sectional): rank(universe, t, ctx).
// universe[SYMBOL] = bars up to and including date t, for every asset that traded on t.
// Return weights {SYMBOL: weight}; weights >= 0, sum to 1 unless the rule allows cash.
export function rank(universe, t, ctx) {
  const syms = Object.keys(universe);
  const n = syms.length;
  const ew = () => {
    const w = {};
    for (const sym of syms) w[sym] = 1 / n;
    return w;
  };

  const btc = universe.BTCUSDT;
  const need = ctx.params.need; // 30
  if (!btc || btc.length < need) return ew();

  const e = btc.length - 2; // lag: 2 -- signals use bars up to the session before the rebalance session
  const lookback = ctx.params.lookback; // 28
  const k0 = e - lookback;
  if (k0 < 0) return ew();

  const cLatest = btc[e].close;
  const cPast = btc[k0].close;
  if (!Number.isFinite(cLatest) || !Number.isFinite(cPast)) return ew();

  const boom = cLatest > cPast;
  return boom ? ew() : { BTCUSDT: 1 };
}
