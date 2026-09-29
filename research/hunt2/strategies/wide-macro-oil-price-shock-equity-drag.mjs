// Oil price shock (WTI 3-month spike) as equity headwind filter
// Source: Hamilton 1983 JME; Kilian 2009 AER.
// Rule: WTI 3-month (63 trading day) % change > +50% -> reduce equity long to 50% for
// the following 60 trading days, else fully long. Checked monthly, applied at next month open.
// INDEX_PROXY: catalogue assetClass "etfs" with no named asset; trading QQQ+DIA directly (discovery ETFs, no proxy needed).

export const meta = {
  id: "wide-macro-oil-price-shock-equity-drag",
  name: "Oil price shock (WTI 3-month spike) as equity headwind filter (wide US stocks)",
  family: "macro-intermarket",
  source: "Hamilton 1983 Journal of Monetary Economics; Kilian 2009 American Economic Review",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lookbackMonths: 3, shockPct: 0.5, dragMonths: 3 }, // 63 trading days ~= 3 monthly rebalances; 60 trading days ~= 3 months
};

const ASSETS = ["QQQ", "DIA"];

// ctx.state.shockMonthsLeft persists across rebalances (module-level state via ctx.state).
export function rank(universe, t, ctx) {
  if (ctx.state.shockMonthsLeft === undefined) ctx.state.shockMonthsLeft = 0;
  if (ctx.state.prevOil === undefined) ctx.state.prevOil = null;

  const oilNow = ctx.macro("DCOILWTICO");
  const n = ctx.params.lookbackMonths;

  // track oil's value at each past monthly rebalance so we can diff against n rebalances ago.
  if (ctx.state.oilHist === undefined) ctx.state.oilHist = [];
  const hist = ctx.state.oilHist;
  if (oilNow !== null) hist.push(oilNow);
  if (hist.length > n + 5) hist.shift();
  let shock = false;
  if (oilNow !== null && hist.length > n) {
    const past = hist[hist.length - 1 - n];
    if (past > 0) {
      const chg = oilNow / past - 1;
      if (chg > ctx.params.shockPct) shock = true;
    }
  }

  if (shock) ctx.state.shockMonthsLeft = ctx.params.dragMonths;
  else if (ctx.state.shockMonthsLeft > 0) ctx.state.shockMonthsLeft -= 1;

  const dragActive = ctx.state.shockMonthsLeft > 0;
  const perAsset = dragActive ? 0.25 : 0.5;

  const w = {};
  for (const sym of ASSETS) {
    if (universe[sym]) w[sym] = perAsset;
  }
  return w;
}
