const SECTOR = {"AAPL":"tech","MSFT":"tech","NVDA":"tech","AVGO":"tech","ORCL":"tech","CRM":"tech","AMD":"tech","INTC":"tech","ADBE":"tech","QCOM":"tech","TXN":"tech","MU":"tech","AMAT":"tech","LRCX":"tech","NOW":"tech","PANW":"tech","SNPS":"tech","CDNS":"tech","ANET":"tech","FTNT":"tech","KLAC":"tech","ON":"tech","SWKS":"tech","TER":"tech","MPWR":"tech","ZBRA":"tech","NTAP":"tech","JNPR":"tech","AKAM":"tech","CIEN":"tech","VSAT":"tech","EXTR":"tech","SMCI":"tech","GOOGL":"comm","META":"comm","NFLX":"comm","DIS":"comm","CMCSA":"comm","T":"comm","VZ":"comm","TMUS":"comm","EA":"comm","TTWO":"comm","OMC":"comm","IPG":"comm","NYT":"comm","LYV":"comm","WBD":"comm","MTCH":"comm","YELP":"comm","CARG":"comm","AMZN":"discretion","TSLA":"discretion","HD":"discretion","MCD":"discretion","LOW":"discretion","SBUX":"discretion","NKE":"discretion","TJX":"discretion","BKNG":"discretion","CMG":"discretion","ORLY":"discretion","AZO":"discretion","ROST":"discretion","YUM":"discretion","DHI":"discretion","LEN":"discretion","GRMN":"discretion","WHR":"discretion","LKQ":"discretion","BBY":"discretion","DKS":"discretion","CROX":"discretion","FIVE":"discretion","SHOO":"discretion","WING":"discretion","WMT":"staples","COST":"staples","PG":"staples","KO":"staples","PEP":"staples","PM":"staples","MO":"staples","MDLZ":"staples","CL":"staples","KMB":"staples","GIS":"staples","SYY":"staples","KR":"staples","HSY":"staples","STZ":"staples","CHD":"staples","CAG":"staples","SJM":"staples","HRL":"staples","LANC":"staples","JJSF":"staples","CALM":"staples","XOM":"energy","CVX":"energy","COP":"energy","EOG":"energy","SLB":"energy","PSX":"energy","VLO":"energy","MPC":"energy","OXY":"energy","WMB":"energy","KMI":"energy","OKE":"energy","HAL":"energy","DVN":"energy","FANG":"energy","HES":"energy","MRO":"energy","APA":"energy","MTDR":"energy","MUR":"energy","CHRD":"energy","AROC":"energy","JPM":"financials","BAC":"financials","WFC":"financials","GS":"financials","MS":"financials","C":"financials","BLK":"financials","SCHW":"financials","AXP":"financials","SPGI":"financials","CB":"financials","PGR":"financials","TRV":"financials","AIG":"financials","MET":"financials","PRU":"financials","ALL":"financials","BK":"financials","STT":"financials","RF":"financials","KEY":"financials","CMA":"financials","ZION":"financials","PB":"financials","WAL":"financials","SNV":"financials","UMBF":"financials","UNH":"health","JNJ":"health","LLY":"health","ABBV":"health","MRK":"health","PFE":"health","TMO":"health","ABT":"health","DHR":"health","BMY":"health","AMGN":"health","GILD":"health","CVS":"health","CI":"health","ISRG":"health","SYK":"health","BSX":"health","MDT":"health","ZBH":"health","BAX":"health","HOLX":"health","MASI":"health","LNTH":"health","NBIX":"health","HALO":"health","CORT":"health","CAT":"industrials","HON":"industrials","UNP":"industrials","BA":"industrials","UPS":"industrials","GE":"industrials","RTX":"industrials","LMT":"industrials","DE":"industrials","MMM":"industrials","EMR":"industrials","ETN":"industrials","ITW":"industrials","CSX":"industrials","NSC":"industrials","FDX":"industrials","PH":"industrials","CMI":"industrials","ROK":"industrials","GD":"industrials","NOC":"industrials","WM":"industrials","AOS":"industrials","SNA":"industrials","GGG":"industrials","NDSN":"industrials","MSM":"industrials","ALSN":"industrials","EME":"industrials","MLI":"industrials","LIN":"materials","APD":"materials","SHW":"materials","ECL":"materials","NEM":"materials","FCX":"materials","DOW":"materials","DD":"materials","PPG":"materials","NUE":"materials","VMC":"materials","MLM":"materials","STLD":"materials","IP":"materials","PKG":"materials","ALB":"materials","CE":"materials","RPM":"materials","AVNT":"materials","WOR":"materials","KALU":"materials","NEE":"utilities","DUK":"utilities","SO":"utilities","D":"utilities","AEP":"utilities","EXC":"utilities","SRE":"utilities","XEL":"utilities","ED":"utilities","PEG":"utilities","WEC":"utilities","ES":"utilities","AEE":"utilities","CMS":"utilities","CNP":"utilities","NI":"utilities","PNW":"utilities","IDA":"utilities","NWE":"utilities","OGE":"utilities","POR":"utilities","PLD":"reits","AMT":"reits","EQIX":"reits","CCI":"reits","PSA":"reits","O":"reits","SPG":"reits","WELL":"reits","AVB":"reits","EQR":"reits","VTR":"reits","ESS":"reits","MAA":"reits","UDR":"reits","REG":"reits","FRT":"reits","KIM":"reits","BXP":"reits","HIW":"reits","EPR":"reits","NNN":"reits"};

export const meta = {
  id: "r24b-peer-leadlag",
  name: "Industry Peer Lead Lag",
  family: "mean-reversion-statarb",
  source: "Hou 2007 (industry lead-lag)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "weekly",
  params: { lag: 2, need: 7, lookback: 5, minSectorNames: 3, minNames: 50, minHoldings: 10, fraction: 0.2 },
};

function equalWeights(universe) {
  const symbols = Object.keys(universe);
  const weights = {};
  for (const symbol of symbols) weights[symbol] = 1 / symbols.length;
  return weights;
}

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const returns = [];
  for (const symbol of Object.keys(universe)) {
    const bars = universe[symbol];
    const L = bars.length;
    if (L < p.need || SECTOR[symbol] === undefined) continue;
    const e = L - p.lag;
    const prior = bars[e - p.lookback].close;
    const close = bars[e].close;
    if (!Number.isFinite(prior) || !Number.isFinite(close) || prior <= 0 || close <= 0) continue;
    const r = close / prior - 1;
    if (Number.isFinite(r)) returns.push([symbol, r]);
  }
  const scores = [];
  for (const [symbol, r] of returns) {
    let sum = 0;
    let count = 0;
    for (const [other, otherR] of returns) {
      if (SECTOR[other] === SECTOR[symbol]) { sum += otherR; count++; }
    }
    if (count >= p.minSectorNames) scores.push([symbol, (sum - r) / (count - 1) - r]);
  }
  if (scores.length < p.minNames) return equalWeights(universe);
  const N = Math.max(p.minHoldings, Math.round(p.fraction * scores.length));
  scores.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const weights = {};
  for (const [symbol] of scores.slice(0, N)) weights[symbol] = 1 / N;
  return weights;
}
