export const meta = {
  "id": "r30-cmf",
  "name": "Chaikin money flow confirmation",
  "family": "social-ta",
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
    "rule": "Long when CMF20 > 0.1 and close > SMA200; zero-range bars contribute zero flow.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  let flow=0,vol=0;for(let k=i-19;k<=i;k++){const b=bars[k];flow+=(b.high>b.low?(2*b.close-b.high-b.low)/(b.high-b.low):0)*b.volume;vol+=b.volume;}return vol>0&&flow/vol>0.1&&c>ctx.sma('close',200,i)?1:0;
}
