// High-yield credit spread widening risk-off signal
// Source: classic credit-spread-as-recession/risk-off leading indicator literature (Gilchrist & Zakrajsek 2012 AER).
// Rule: ICE BofA US HY OAS (BAMLH0A0HYM2) rises >= 0.3 pct pts over the trailing 4 weeks ->
// rotate from equity (QQQ+DIA) into bonds (AGG); otherwise stay in equity. Checked weekly.
// NOTE: BAMLH0A0HYM2 only has discovery coverage from 2023-09, so this trades a short (~18mo) window.
// INDEX_PROXY: catalogue names no specific equity index; trading QQQ+DIA (discovery ETFs).

export const meta = {
  id: "macro-hy-credit-spread-risk-off__rob1",
  name: "High-yield credit spread widening risk-off signal (-25%)",
  family: "macro-intermarket",
  source: "Gilchrist & Zakrajsek 2012 American Economic Review (excess bond premium / credit spreads)",
  assetClass: "etf",
  timeframe: "1d",
  universe: "ETFS_DAILY",
  rebalance: "weekly",
  params: { lookbackWeeks: 3, widenThresholdPts: 0.3 },
};

const RISK_ASSETS = ["QQQ", "DIA"];
const SAFE_ASSET = "AGG";

export function rank(universe, t, ctx) {
  const n = ctx.params.lookbackWeeks;
  const spreadNow = ctx.macro("BAMLH0A0HYM2");

  if (ctx.state.hist === undefined) ctx.state.hist = [];
  const hist = ctx.state.hist;
  if (spreadNow !== null) hist.push(spreadNow);
  if (hist.length > n + 5) hist.shift();

  let riskOff = false;
  if (spreadNow !== null && hist.length > n) {
    const past = hist[hist.length - 1 - n];
    if (spreadNow - past >= ctx.params.widenThresholdPts) riskOff = true;
  }

  const w = {};
  if (riskOff) {
    if (universe[SAFE_ASSET]) w[SAFE_ASSET] = 1;
  } else {
    const avail = RISK_ASSETS.filter((s) => universe[s]);
    for (const sym of avail) w[sym] = 1 / avail.length;
  }
  return w;
}
