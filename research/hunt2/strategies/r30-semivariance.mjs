export const meta = {
  "id": "r30-semivariance",
  "name": "Upside semivariance momentum",
  "family": "volatility",
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
    "rule": "Long when 20-bar sum of squared positive returns exceeds twice squared negative returns and ROC60 > 0.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  let up=0,down=0;for(let k=i-19;k<=i;k++){const r=bars[k].close/bars[k-1].close-1;if(r>0)up+=r*r;else down+=r*r;}return up>2*down&&c>bars[i-60].close?1:0;
}
