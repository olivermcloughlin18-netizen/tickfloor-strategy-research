// prereg-2026-09-25 B1: industry momentum on the frozen 266-name sector map (covers the holdout
// names too). Sector score = mean 126-session return of its eligible names; hold every name in
// the top 3 sectors, equal weight.
export const meta = {
  id: "r25-sector-mom-map",
  name: "Sector momentum, top 3 of 11 sectors, 266-name map (wide US stocks)",
  family: "momentum",
  source: "Moskowitz & Grinblatt 1999 JF (do industries explain momentum?)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 128, lag: 2, minNames: 50, lookback: 126, sectors: 3, minPerSector: 3 },
};

const SECTOR = {"AAPL":"tech","MSFT":"tech","NVDA":"tech","AVGO":"tech","ORCL":"tech","CRM":"tech","AMD":"tech","INTC":"tech","ADBE":"tech","QCOM":"tech","TXN":"tech","MU":"tech","AMAT":"tech","LRCX":"tech","NOW":"tech","PANW":"tech","SNPS":"tech","CDNS":"tech","ANET":"tech","FTNT":"tech","KLAC":"tech","ON":"tech","SWKS":"tech","TER":"tech","MPWR":"tech","ZBRA":"tech","NTAP":"tech","JNPR":"tech","AKAM":"tech","CIEN":"tech","VSAT":"tech","EXTR":"tech","SMCI":"tech","GOOGL":"comm","META":"comm","NFLX":"comm","DIS":"comm","CMCSA":"comm","T":"comm","VZ":"comm","TMUS":"comm","EA":"comm","TTWO":"comm","OMC":"comm","IPG":"comm","NYT":"comm","LYV":"comm","WBD":"comm","MTCH":"comm","YELP":"comm","CARG":"comm","AMZN":"discretion","TSLA":"discretion","HD":"discretion","MCD":"discretion","LOW":"discretion","SBUX":"discretion","NKE":"discretion","TJX":"discretion","BKNG":"discretion","CMG":"discretion","ORLY":"discretion","AZO":"discretion","ROST":"discretion","YUM":"discretion","DHI":"discretion","LEN":"discretion","GRMN":"discretion","WHR":"discretion","LKQ":"discretion","BBY":"discretion","DKS":"discretion","CROX":"discretion","FIVE":"discretion","SHOO":"discretion","WING":"discretion","WMT":"staples","COST":"staples","PG":"staples","KO":"staples","PEP":"staples","PM":"staples","MO":"staples","MDLZ":"staples","CL":"staples","KMB":"staples","GIS":"staples","SYY":"staples","KR":"staples","HSY":"staples","STZ":"staples","CHD":"staples","CAG":"staples","SJM":"staples","HRL":"staples","LANC":"staples","JJSF":"staples","CALM":"staples","XOM":"energy","CVX":"energy","COP":"energy","EOG":"energy","SLB":"energy","PSX":"energy","VLO":"energy","MPC":"energy","OXY":"energy","WMB":"energy","KMI":"energy","OKE":"energy","HAL":"energy","DVN":"energy","FANG":"energy","HES":"energy","MRO":"energy","APA":"energy","MTDR":"energy","MUR":"energy","CHRD":"energy","AROC":"energy","JPM":"financials","BAC":"financials","WFC":"financials","GS":"financials","MS":"financials","C":"financials","BLK":"financials","SCHW":"financials","AXP":"financials","SPGI":"financials","CB":"financials","PGR":"financials","TRV":"financials","AIG":"financials","MET":"financials","PRU":"financials","ALL":"financials","BK":"financials","STT":"financials","RF":"financials","KEY":"financials","CMA":"financials","ZION":"financials","PB":"financials","WAL":"financials","SNV":"financials","UMBF":"financials","UNH":"health","JNJ":"health","LLY":"health","ABBV":"health","MRK":"health","PFE":"health","TMO":"health","ABT":"health","DHR":"health","BMY":"health","AMGN":"health","GILD":"health","CVS":"health","CI":"health","ISRG":"health","SYK":"health","BSX":"health","MDT":"health","ZBH":"health","BAX":"health","HOLX":"health","MASI":"health","LNTH":"health","NBIX":"health","HALO":"health","CORT":"health","CAT":"industrials","HON":"industrials","UNP":"industrials","BA":"industrials","UPS":"industrials","GE":"industrials","RTX":"industrials","LMT":"industrials","DE":"industrials","MMM":"industrials","EMR":"industrials","ETN":"industrials","ITW":"industrials","CSX":"industrials","NSC":"industrials","FDX":"industrials","PH":"industrials","CMI":"industrials","ROK":"industrials","GD":"industrials","NOC":"industrials","WM":"industrials","AOS":"industrials","SNA":"industrials","GGG":"industrials","NDSN":"industrials","MSM":"industrials","ALSN":"industrials","EME":"industrials","MLI":"industrials","LIN":"materials","APD":"materials","SHW":"materials","ECL":"materials","NEM":"materials","FCX":"materials","DOW":"materials","DD":"materials","PPG":"materials","NUE":"materials","VMC":"materials","MLM":"materials","STLD":"materials","IP":"materials","PKG":"materials","ALB":"materials","CE":"materials","RPM":"materials","AVNT":"materials","WOR":"materials","KALU":"materials","NEE":"utilities","DUK":"utilities","SO":"utilities","D":"utilities","AEP":"utilities","EXC":"utilities","SRE":"utilities","XEL":"utilities","ED":"utilities","PEG":"utilities","WEC":"utilities","ES":"utilities","AEE":"utilities","CMS":"utilities","CNP":"utilities","NI":"utilities","PNW":"utilities","IDA":"utilities","NWE":"utilities","OGE":"utilities","POR":"utilities","PLD":"reits","AMT":"reits","EQIX":"reits","CCI":"reits","PSA":"reits","O":"reits","SPG":"reits","WELL":"reits","AVB":"reits","EQR":"reits","VTR":"reits","ESS":"reits","MAA":"reits","UDR":"reits","REG":"reits","FRT":"reits","KIM":"reits","BXP":"reits","HIW":"reits","EPR":"reits","NNN":"reits"};

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { need, lag, minNames, lookback, sectors, minPerSector } = ctx.params;
  const bySec = {};
  let M = 0;
  for (const sym of Object.keys(universe)) {
    if (!Object.hasOwn(SECTOR, sym)) continue;
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    const r = b[e].close / b[e - lookback].close - 1;
    if (!Number.isFinite(r)) continue;
    M++;
    (bySec[SECTOR[sym]] ??= []).push([sym, r]);
  }
  if (M < minNames) return ew(universe);
  const rows = Object.keys(bySec)
    .filter((s) => bySec[s].length >= minPerSector)
    .map((s) => [s, bySec[s].reduce((p, x) => p + x[1], 0) / bySec[s].length])
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  if (rows.length < sectors) return ew(universe);
  const held = rows.slice(0, sectors).flatMap(([s]) => bySec[s].map((x) => x[0]));
  const out = {};
  for (const sym of held) out[sym] = 1 / held.length;
  return out;
}
