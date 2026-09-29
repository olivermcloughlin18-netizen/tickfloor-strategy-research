export const meta = {
  id: "r24b-crypto-funding-exit",
  name: "Crypto Funding Exit",
  family: "carry",
  source: "Schmeling, Schrimpf & Todorov 2023",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  params: { sampleSize: 365, fundingLag: 1, zThreshold: 2, flatBars: 7 },
};

export function signal(bars, i, ctx) {
  if (ctx.state.samples === undefined) ctx.state.samples = [];
  if (ctx.state.remaining === undefined) ctx.state.remaining = 0;
  if (i < ctx.params.fundingLag) return 1;
  const f = ctx.fundingRate(i - ctx.params.fundingLag);
  let spike = false;
  if (f !== null && Number.isFinite(f)) {
    const samples = ctx.state.samples;
    if (samples.length >= ctx.params.sampleSize) {
      let sum = 0;
      for (const sample of samples) sum += sample;
      const mean = sum / samples.length;
      let squared = 0;
      for (const sample of samples) squared += (sample - mean) * (sample - mean);
      const sd = Math.sqrt(squared / (samples.length - 1));
      spike = sd > 0 && (f - mean) / sd > ctx.params.zThreshold;
    }
    samples.push(f);
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
