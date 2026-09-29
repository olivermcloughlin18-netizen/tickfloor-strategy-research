const SECTOR = {"AAPL":"tech","MSFT":"tech","NVDA":"tech","AVGO":"tech","ORCL":"tech","CRM":"tech","AMD":"tech","INTC":"tech","ADBE":"tech","QCOM":"tech","TXN":"tech","MU":"tech","AMAT":"tech","LRCX":"tech","NOW":"tech","PANW":"tech","SNPS":"tech","CDNS":"tech","ANET":"tech","FTNT":"tech","KLAC":"tech","ON":"tech","SWKS":"tech","TER":"tech","MPWR":"tech","ZBRA":"tech","NTAP":"tech","JNPR":"tech","AKAM":"tech","CIEN":"tech","VSAT":"tech","EXTR":"tech","SMCI":"tech","GOOGL":"comm","META":"comm","NFLX":"comm","DIS":"comm","CMCSA":"comm","T":"comm","VZ":"comm","TMUS":"comm","EA":"comm","TTWO":"comm","OMC":"comm","IPG":"comm","NYT":"comm","LYV":"comm","WBD":"comm","MTCH":"comm","YELP":"comm","CARG":"comm","AMZN":"discretion","TSLA":"discretion","HD":"discretion","MCD":"discretion","LOW":"discretion","SBUX":"discretion","NKE":"discretion","TJX":"discretion","BKNG":"discretion","CMG":"discretion","ORLY":"discretion","AZO":"discretion","ROST":"discretion","YUM":"discretion","DHI":"discretion","LEN":"discretion","GRMN":"discretion","WHR":"discretion","LKQ":"discretion","BBY":"discretion","DKS":"discretion","CROX":"discretion","FIVE":"discretion","SHOO":"discretion","WING":"discretion","WMT":"staples","COST":"staples","PG":"staples","KO":"staples","PEP":"staples","PM":"staples","MO":"staples","MDLZ":"staples","CL":"staples","KMB":"staples","GIS":"staples","SYY":"staples","KR":"staples","HSY":"staples","STZ":"staples","CHD":"staples","CAG":"staples","SJM":"staples","HRL":"staples","LANC":"staples","JJSF":"staples","CALM":"staples","XOM":"energy","CVX":"energy","COP":"energy","EOG":"energy","SLB":"energy","PSX":"energy","VLO":"energy","MPC":"energy","OXY":"energy","WMB":"energy","KMI":"energy","OKE":"energy","HAL":"energy","DVN":"energy","FANG":"energy","HES":"energy","MRO":"energy","APA":"energy","MTDR":"energy","MUR":"energy","CHRD":"energy","AROC":"energy","JPM":"financials","BAC":"financials","WFC":"financials","GS":"financials","MS":"financials","C":"financials","BLK":"financials","SCHW":"financials","AXP":"financials","SPGI":"financials","CB":"financials","PGR":"financials","TRV":"financials","AIG":"financials","MET":"financials","PRU":"financials","ALL":"financials","BK":"financials","STT":"financials","RF":"financials","KEY":"financials","CMA":"financials","ZION":"financials","PB":"financials","WAL":"financials","SNV":"financials","UMBF":"financials","UNH":"health","JNJ":"health","LLY":"health","ABBV":"health","MRK":"health","PFE":"health","TMO":"health","ABT":"health","DHR":"health","BMY":"health","AMGN":"health","GILD":"health","CVS":"health","CI":"health","ISRG":"health","SYK":"health","BSX":"health","MDT":"health","ZBH":"health","BAX":"health","HOLX":"health","MASI":"health","LNTH":"health","NBIX":"health","HALO":"health","CORT":"health","CAT":"industrials","HON":"industrials","UNP":"industrials","BA":"industrials","UPS":"industrials","GE":"industrials","RTX":"industrials","LMT":"industrials","DE":"industrials","MMM":"industrials","EMR":"industrials","ETN":"industrials","ITW":"industrials","CSX":"industrials","NSC":"industrials","FDX":"industrials","PH":"industrials","CMI":"industrials","ROK":"industrials","GD":"industrials","NOC":"industrials","WM":"industrials","AOS":"industrials","SNA":"industrials","GGG":"industrials","NDSN":"industrials","MSM":"industrials","ALSN":"industrials","EME":"industrials","MLI":"industrials","LIN":"materials","APD":"materials","SHW":"materials","ECL":"materials","NEM":"materials","FCX":"materials","DOW":"materials","DD":"materials","PPG":"materials","NUE":"materials","VMC":"materials","MLM":"materials","STLD":"materials","IP":"materials","PKG":"materials","ALB":"materials","CE":"materials","RPM":"materials","AVNT":"materials","WOR":"materials","KALU":"materials","NEE":"utilities","DUK":"utilities","SO":"utilities","D":"utilities","AEP":"utilities","EXC":"utilities","SRE":"utilities","XEL":"utilities","ED":"utilities","PEG":"utilities","WEC":"utilities","ES":"utilities","AEE":"utilities","CMS":"utilities","CNP":"utilities","NI":"utilities","PNW":"utilities","IDA":"utilities","NWE":"utilities","OGE":"utilities","POR":"utilities","PLD":"reits","AMT":"reits","EQIX":"reits","CCI":"reits","PSA":"reits","O":"reits","SPG":"reits","WELL":"reits","AVB":"reits","EQR":"reits","VTR":"reits","ESS":"reits","MAA":"reits","UDR":"reits","REG":"reits","FRT":"reits","KIM":"reits","BXP":"reits","HIW":"reits","EPR":"reits","NNN":"reits"};

export const meta = {
  id: "r27-wide-indrev-weekly",
  name: "Weekly within-industry reversal (wide US stocks)",
  family: "mean_reversion",
  source: "Da, Liu & Schaumburg 2014 Management Science 'A closer look at the short-term return reversal' (weekly reversal is a within-industry effect); Lehmann 1990 QJE",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "weekly",
  params: { lag: 2, lookback: 5, need: 7, minSectorNames: 3 },
};

function ewPresent(universe) {
  const symbols = Object.keys(universe);
  const weights = {};
  for (const sym of symbols) weights[sym] = 1 / symbols.length;
  return weights;
}

// Rank mode: weekly within-sector short-term reversal on the wide us_stock universe.
// r5 = 5-session return ending the session before rebalance; score = r5 minus that
// name's sector's mean r5 (sectors with < minSectorNames eligible names are excluded);
// go long the N names with the lowest (most sector-lagging) score, equal-weighted.
export function rank(universe, t, ctx) {
  const p = ctx.params;
  const symbols = Object.keys(universe);

  const eligible = [];
  for (const sym of symbols) {
    const b = universe[sym];
    const L = b.length;
    if (L < p.need) continue;
    const e = L - p.lag;
    const closeE = b[e].close;
    const closePrior = b[e - p.lookback].close;
    if (!Number.isFinite(closeE) || !Number.isFinite(closePrior)) continue;
    const r5 = closeE / closePrior - 1;
    if (!Number.isFinite(r5)) continue;
    eligible.push({ sym, r5, sector: SECTOR[sym] });
  }

  const M = eligible.length;
  if (M < 50) return ewPresent(universe);
  const N = Math.max(10, Math.round(0.2 * M));

  const groups = {};
  for (const item of eligible) {
    if (!item.sector) continue;
    if (!groups[item.sector]) groups[item.sector] = [];
    groups[item.sector].push(item);
  }

  const scored = [];
  for (const sector of Object.keys(groups)) {
    const group = groups[sector];
    if (group.length < p.minSectorNames) continue;
    let sum = 0;
    for (const item of group) sum += item.r5;
    const sectorMean = sum / group.length;
    for (const item of group) scored.push({ sym: item.sym, score: item.r5 - sectorMean });
  }
  if (!scored.length) return ewPresent(universe);

  scored.sort((a, b) => a.score - b.score || (a.sym < b.sym ? -1 : a.sym > b.sym ? 1 : 0));
  const held = scored.slice(0, N);
  const weights = {};
  for (const item of held) weights[item.sym] = 1 / held.length;
  return weights;
}
