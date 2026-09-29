export const meta = {
  id: "r24b-ctrl-spike-exit-crypto",
  name: "Crypto Spike Exit Control",
  family: "deep-validation-control",
  source: "Preregistered control",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  params: { sampleSize: 365, lookback: 3, zThreshold: 2, flatBars: 7 },
};

export function signal(bars, i, ctx) {
  if (ctx.state.samples === undefined) ctx.state.samples = [];
  if (ctx.state.remaining === undefined) ctx.state.remaining = 0;
  if (i < ctx.params.lookback + 1) return 1;
  const close = bars[i - 1].close;
  const prior = bars[i - 1 - ctx.params.lookback].close;
  let spike = false;
  if (Number.isFinite(close) && Number.isFinite(prior) && close > 0 && prior > 0) {
    const value = close / prior - 1;
    const samples = ctx.state.samples;
    if (samples.length >= ctx.params.sampleSize) {
      let sum = 0;
      for (const sample of samples) sum += sample;
      const mean = sum / samples.length;
      let squared = 0;
      for (const sample of samples) squared += (sample - mean) * (sample - mean);
      const sd = Math.sqrt(squared / (samples.length - 1));
      spike = sd > 0 && (value - mean) / sd > ctx.params.zThreshold;
    }
    samples.push(value);
    if (samples.length > ctx.params.sampleSize) samples.shift();
  }
  if (spike) {
    ctx.state.remaining = ctx.params.flatBars - 1;
    return 0;
  }
  if (ctx.state.remaining > 0) {
    ctx.state.remaining -= 1;
    return 0;
  }
  return 1;
}
