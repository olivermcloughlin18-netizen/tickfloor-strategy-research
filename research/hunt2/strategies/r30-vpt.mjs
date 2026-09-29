export const meta = {
  "id": "r30-vpt",
  "name": "Volume price trend",
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
    "rule": "Long when 20-bar sum(volume times close return) > 0 and close > SMA200.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  let x=0;for(let k=i-19;k<=i;k++)x+=bars[k].volume*(bars[k].close/bars[k-1].close-1);return x>0&&c>ctx.sma('close',200,i)?1:0;
}
