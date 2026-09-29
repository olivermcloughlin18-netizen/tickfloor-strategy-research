export const meta = {
  id: "terra8-gate-invvol-etf",
  name: "Trend gate + inverse-vol sizing (ETF monthly)",
  source: "Baltas & Kosowski 2013 / Faber 2007 — decomposition lane terra-8",
  assetClass: "etf",
  timeframe: "1d",
  universe: "ETFS_DAILY",
  rebalance: "monthly",
  family: "trend",
  params: { trendWindow: 200, volWindow: 60 },
};

export function rank(universe, t, ctx) {
  const eligible = [];
  let S = 0;

  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    const n = b.length;
    if (n < 201) continue;

    let closeSum = 0;
    for (let k = n - 200; k < n; k++) closeSum += b[k].close;
    const trendOK = b[n - 1].close > closeSum / 200;

    let returnSum = 0;
    for (let k = n - 60; k < n; k++) returnSum += b[k].close / b[k - 1].close - 1;
    const returnMean = returnSum / 60;
    let squaredDiffSum = 0;
    for (let k = n - 60; k < n; k++) {
      const r = b[k].close / b[k - 1].close - 1;
      squaredDiffSum += (r - returnMean) * (r - returnMean);
    }
    const vol = Math.sqrt(squaredDiffSum / 59);
    if (!Number.isFinite(vol) || vol <= 0) continue;

    const invVol = 1 / vol;
    eligible.push({ sym, trendOK, invVol });
    S += invVol;
  }

  const w = {};
  for (const item of eligible) w[item.sym] = item.trendOK ? item.invVol / S : 0;
  return w;
}
