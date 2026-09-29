// 1-day reversal after a high-volume down day (Nagel 2012-style short-term
// reversal, volume-conditioned; equity version already tested/null, this is
// the untested crypto-daily variant — asset class differs, not re-derived).
export const meta = {
  id: "mrsa-crypto-short-term-reversal-volume",
  name: "Crypto 1-day reversal after a high-volume down day",
  family: "mean-reversion-statarb",
  source: "Nagel 2012 RFS (short-term reversal & liquidity provision), volume-conditioned",
  assetClass: "crypto",
  timeframe: "1d",
  longShort: true,
  params: { volLookback: 20, volZ: 1.0 },
};

export function signal(bars, i, ctx) {
  const n = ctx.params.volLookback;
  if (i < n + 1) return 0;
  const volMean = ctx.sma("volume", n, i - 1);
  const volStd = ctx.rollingStd("volume", n, i - 1);
  if (!Number.isFinite(volMean) || !Number.isFinite(volStd) || volStd === 0) return 0;
  const z = (bars[i].volume - volMean) / volStd;
  const dayRet = bars[i].close / bars[i - 1].close - 1;
  if (z >= ctx.params.volZ && dayRet < 0) return 1;  // volume-spike down day -> buy the bounce
  if (z >= ctx.params.volZ && dayRet > 0) return -1; // volume-spike up day -> fade it
  return 0;
}
