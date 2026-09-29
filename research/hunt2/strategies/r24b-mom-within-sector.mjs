const SECTOR = {"AAPL":"tech","MSFT":"tech","NVDA":"tech","AVGO":"tech","ORCL":"tech","CRM":"tech","AMD":"tech","INTC":"tech","ADBE":"tech","QCOM":"tech","TXN":"tech","MU":"tech","AMAT":"tech","LRCX":"tech","NOW":"tech","PANW":"tech","SNPS":"tech","CDNS":"tech","ANET":"tech","FTNT":"tech","KLAC":"tech","ON":"tech","SWKS":"tech","TER":"tech","MPWR":"tech","ZBRA":"tech","NTAP":"tech","JNPR":"tech","AKAM":"tech","CIEN":"tech","VSAT":"tech","EXTR":"tech","SMCI":"tech","GOOGL":"comm","META":"comm","NFLX":"comm","DIS":"comm","CMCSA":"comm","T":"comm","VZ":"comm","TMUS":"comm","EA":"comm","TTWO":"comm","OMC":"comm","IPG":"comm","NYT":"comm","LYV":"comm","WBD":"comm","MTCH":"comm","YELP":"comm","CARG":"comm","AMZN":"discretion","TSLA":"discretion","HD":"discretion","MCD":"discretion","LOW":"discretion","SBUX":"discretion","NKE":"discretion","TJX":"discretion","BKNG":"discretion","CMG":"discretion","ORLY":"discretion","AZO":"discretion","ROST":"discretion","YUM":"discretion","DHI":"discretion","LEN":"discretion","GRMN":"discretion","WHR":"discretion","LKQ":"discretion","BBY":"discretion","DKS":"discretion","CROX":"discretion","FIVE":"discretion","SHOO":"discretion","WING":"discretion","WMT":"staples","COST":"staples","PG":"staples","KO":"staples","PEP":"staples","PM":"staples","MO":"staples","MDLZ":"staples","CL":"staples","KMB":"staples","GIS":"staples","SYY":"staples","KR":"staples","HSY":"staples","STZ":"staples","CHD":"staples","CAG":"staples","SJM":"staples","HRL":"staples","LANC":"staples","JJSF":"staples","CALM":"staples","XOM":"energy","CVX":"energy","COP":"energy","EOG":"energy","SLB":"energy","PSX":"energy","VLO":"energy","MPC":"energy","OXY":"energy","WMB":"energy","KMI":"energy","OKE":"energy","HAL":"energy","DVN":"energy","FANG":"energy","HES":"energy","MRO":"energy","APA":"energy","MTDR":"energy","MUR":"energy","CHRD":"energy","AROC":"energy","JPM":"financials","BAC":"financials","WFC":"financials","GS":"financials","MS":"financials","C":"financials","BLK":"financials","SCHW":"financials","AXP":"financials","SPGI":"financials","CB":"financials","PGR":"financials","TRV":"financials","AIG":"financials","MET":"financials","PRU":"financials","ALL":"financials","BK":"financials","STT":"financials","RF":"financials","KEY":"financials","CMA":"financials","ZION":"financials","PB":"financials","WAL":"financials","SNV":"financials","UMBF":"financials","UNH":"health","JNJ":"health","LLY":"health","ABBV":"health","MRK":"health","PFE":"health","TMO":"health","ABT":"health","DHR":"health","BMY":"health","AMGN":"health","GILD":"health","CVS":"health","CI":"health","ISRG":"health","SYK":"health","BSX":"health","MDT":"health","ZBH":"health","BAX":"health","HOLX":"health","MASI":"health","LNTH":"health","NBIX":"health","HALO":"health","CORT":"health","CAT":"industrials","HON":"industrials","UNP":"industrials","BA":"industrials","UPS":"industrials","GE":"industrials","RTX":"industrials","LMT":"industrials","DE":"industrials","MMM":"industrials","EMR":"industrials","ETN":"industrials","ITW":"industrials","CSX":"industrials","NSC":"industrials","FDX":"industrials","PH":"industrials","CMI":"industrials","ROK":"industrials","GD":"industrials","NOC":"industrials","WM":"industrials","AOS":"industrials","SNA":"industrials","GGG":"industrials","NDSN":"industrials","MSM":"industrials","ALSN":"industrials","EME":"industrials","MLI":"industrials","LIN":"materials","APD":"materials","SHW":"materials","ECL":"materials","NEM":"materials","FCX":"materials","DOW":"materials","DD":"materials","PPG":"materials","NUE":"materials","VMC":"materials","MLM":"materials","STLD":"materials","IP":"materials","PKG":"materials","ALB":"materials","CE":"materials","RPM":"materials","AVNT":"materials","WOR":"materials","KALU":"materials","NEE":"utilities","DUK":"utilities","SO":"utilities","D":"utilities","AEP":"utilities","EXC":"utilities","SRE":"utilities","XEL":"utilities","ED":"utilities","PEG":"utilities","WEC":"utilities","ES":"utilities","AEE":"utilities","CMS":"utilities","CNP":"utilities","NI":"utilities","PNW":"utilities","IDA":"utilities","NWE":"utilities","OGE":"utilities","POR":"utilities","PLD":"reits","AMT":"reits","EQIX":"reits","CCI":"reits","PSA":"reits","O":"reits","SPG":"reits","WELL":"reits","AVB":"reits","EQR":"reits","VTR":"reits","ESS":"reits","MAA":"reits","UDR":"reits","REG":"reits","FRT":"reits","KIM":"reits","BXP":"reits","HIW":"reits","EPR":"reits","NNN":"reits"};

export const meta = {
  id: "r24b-mom-within-sector",
  name: "Within-Sector 12-1 Momentum",
  family: "momentum",
  source: "Asness, Porter & Stevens 2000 (industry-neutral momentum)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 254, lag: 2, formationWindow: 252, skip: 21, sectorFraction: 0.2, minSectorNames: 3 },
};

function equalWeight(universe) {
  const symbols = Object.keys(universe);
  if (!symbols.length) return {};
  const weights = {};
  for (const sym of symbols) weights[sym] = 1 / symbols.length;
  return weights;
}

export function rank(universe, t, ctx) {
  const scores = [];
  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    const L = bars.length;
    if (L < ctx.params.need) continue;
    const e = L - ctx.params.lag;
    const start = bars[e - ctx.params.formationWindow].close;
    const end = bars[e - ctx.params.skip].close;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0) continue;
    const score = end / start - 1;
    if (Number.isFinite(score)) scores.push({ sym, score, sector: SECTOR[sym] });
  }
  if (scores.length < 50) return equalWeight(universe);
  const groups = {};
  for (const item of scores) {
    if (!item.sector) continue;
    if (!groups[item.sector]) groups[item.sector] = [];
    groups[item.sector].push(item);
  }
  const held = [];
  for (const sector of Object.keys(groups).sort()) {
    const group = groups[sector];
    if (group.length < ctx.params.minSectorNames) continue;
    const count = Math.max(1, Math.round(ctx.params.sectorFraction * group.length));
    group.sort((a, b) => b.score - a.score || a.sym.localeCompare(b.sym));
    held.push(...group.slice(0, count));
  }
  if (!held.length) return {};
  const weights = {};
  for (const item of held) weights[item.sym] = 1 / held.length;
  return weights;
}
