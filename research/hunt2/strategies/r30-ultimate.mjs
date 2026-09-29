export const meta = {
  "id": "r30-ultimate",
  "name": "Ultimate oscillator dip",
  "family": "mean-reversion-statarb",
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
    "rule": "Long 5 bars when weighted buying-pressure ratios (7,14,28; weights 4,2,1) < 35 and close > SMA200.",
    "signalLagBars": 1,
    "warmupBars": 200
  },
  "holdBars": 5
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  const ratio=n=>{let bp=0,tr=0;for(let k=i-n+1;k<=i;k++){const low=Math.min(bars[k].low,bars[k-1].close);bp+=bars[k].close-low;tr+=Math.max(bars[k].high,bars[k-1].close)-low;}return tr?bp/tr:0.5;};return 100*(4*ratio(7)+2*ratio(14)+ratio(28))/7<35&&c>ctx.sma('close',200,i)?1:0;
}
