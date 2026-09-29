export const meta = {
  "id": "r30-kama",
  "name": "Kaufman adaptive moving average",
  "family": "trend",
  "source": "research/prereg-2026-09-24.md; local unvalidated hypothesis",
  "assetClass": "us_stock",
  "timeframe": "1d",
  "assets": [
    "AAPL",
    "AMZN",
    "GOOGL",
    "JPM",
    "XOM",
    "JNJ",
    "V",
    "COST"
  ],
  "longShort": false,
  "params": {
    "rule": "KAMA efficiency window 10, fast 2, slow 30; long when close > rising KAMA. Seed at first eligible close.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  let noise=0;for(let k=i-9;k<=i;k++)noise+=Math.abs(bars[k].close-bars[k-1].close);const er=noise?Math.abs(c-bars[i-10].close)/noise:0;const a=(er*(2/3-2/31)+2/31)**2;const old=ctx.state.kama??c;const now=old+a*(c-old);ctx.state.kama=now;return c>now&&now>old?1:0;
}
