// r27-wide-mom-lifecycle (batch C6, family momentum, track PROMISING).
// Lee & Swaminathan 2000 JF 'Price momentum and trading volume': among wide-universe 12-1
// momentum winners, tilt to the ones with the lowest recent-vs-own-history dollar volume
// (proxy for low turnover, since shares outstanding isn't in the harness).
export const meta = {
  id: "r27-wide-mom-lifecycle",
  name: "Low-volume momentum winners (wide US stocks)",
  family: "momentum",
  source: "Lee & Swaminathan 2000 JF 'Price momentum and trading volume' (low-volume winners beat high-volume winners). Turnover needs shares outstanding, which the harness lacks, so recent-vs-own-history dollar volume stands in (disclosed).",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lag: 2, volShort: 63, volLong: 252, need: 254, winnerFrac: 0.4 },
};

export function rank(universe, t, ctx) {
  const need = ctx.params.need;
  const winnerFrac = ctx.params.winnerFrac;
  const syms = Object.keys(universe).sort();

  function ewPresent() {
    const w = {};
    for (const sym of syms) w[sym] = 1 / syms.length;
    return w;
  }

  const eligible = [];
  for (const sym of syms) {
    const b = universe[sym];
    const L = b.length;
    const e = L - 2; // session before the rebalance session
    if (L < need) continue;
    if (e - 252 < 0) continue; // needs b[e-252] for 12-1 momentum

    const pNow = b[e - 21].close;
    const pThen = b[e - 252].close;
    if (!Number.isFinite(pNow) || !Number.isFinite(pThen) || pThen === 0) continue;
    const mom = pNow / pThen - 1;
    if (!Number.isFinite(mom)) continue;

    // tau = mean(dv, k=e-62..e) / mean(dv, k=e-251..e), dv(k) = close(k) * volume(k)
    let sumShort = 0;
    let ok = true;
    for (let k = e - 62; k <= e; k++) {
      const bar = b[k];
      if (!bar || !Number.isFinite(bar.close) || !Number.isFinite(bar.volume)) {
        ok = false;
        break;
      }
      sumShort += bar.close * bar.volume;
    }
    if (!ok) continue;

    let sumLong = 0;
    for (let k = e - 251; k <= e; k++) {
      const bar = b[k];
      if (!bar || !Number.isFinite(bar.close) || !Number.isFinite(bar.volume)) {
        ok = false;
        break;
      }
      sumLong += bar.close * bar.volume;
    }
    if (!ok) continue;

    const dvShortMean = sumShort / 63;
    const dvLongMean = sumLong / 252;
    if (!Number.isFinite(dvShortMean) || !Number.isFinite(dvLongMean) || dvLongMean === 0) continue;
    const tau = dvShortMean / dvLongMean;
    if (!Number.isFinite(tau)) continue;

    eligible.push({ sym, mom, tau });
  }

  const M = eligible.length;
  if (M < 50) return ewPresent();

  const N = Math.max(10, Math.round(0.2 * M));

  // top ceil(winnerFrac * M) names by momentum, ties by symbol ascending
  eligible.sort((a, b) => {
    if (b.mom !== a.mom) return b.mom - a.mom;
    return a.sym < b.sym ? -1 : a.sym > b.sym ? 1 : 0;
  });
  const wCount = Math.ceil(winnerFrac * M);
  const W = eligible.slice(0, wCount);

  // within W, EW over the N names with the lowest tau, ties by symbol ascending
  W.sort((a, b) => {
    if (a.tau !== b.tau) return a.tau - b.tau;
    return a.sym < b.sym ? -1 : a.sym > b.sym ? 1 : 0;
  });
  const pick = W.length < N ? W : W.slice(0, N);

  const w = {};
  for (const s of pick) w[s.sym] = 1 / pick.length;
  return w;
}
