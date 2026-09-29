export const meta = {
  id: "r27-wide-factor-mom",
  name: "Factor momentum across five stock sleeves (wide US stocks)",
  family: "momentum",
  source: "u/ImNotSelling, r/Trading 1wop3th (people who make it adapt strategies to conditions and drop what stops working); Ehsani & Linnainmaa 2022 JF 'Factor momentum and the momentum factor'; Gupta & Kelly 2019 JPM",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lag: 2, need: 254, histMonths: 12 },
};

const SLEEVE_KEYS = ["S1", "S2", "S3", "S4", "S5"];

// Rank names by val (desc=true -> highest first), ties broken by symbol ascending, take first n.
function pickN(list, n, desc) {
  const arr = list.slice().sort((a, b) => {
    const d = desc ? b.val - a.val : a.val - b.val;
    if (d !== 0) return d;
    return a.sym < b.sym ? -1 : a.sym > b.sym ? 1 : 0;
  });
  return arr.slice(0, n).map((x) => x.sym);
}

// Per-symbol eligibility + the metrics every sleeve needs. Returns null if not eligible.
function evalSymbol(b, lag, need) {
  const L = b.length;
  if (L < need) return null;
  const e = L - lag;
  if (e - 252 < 0) return null;
  const rets = new Array(252); // rets[idx] = r(e-251+idx), idx=0..251
  for (let idx = 0; idx < 252; idx++) {
    const k = e - 251 + idx;
    const cur = b[k].close, prev = b[k - 1].close;
    const r = cur / prev - 1;
    if (!Number.isFinite(r)) return null;
    rets[idx] = r;
  }
  const c_e = b[e].close;
  const c_e21 = b[e - 21].close;
  const c_e252 = b[e - 252].close;
  if (!Number.isFinite(c_e) || !Number.isFinite(c_e21) || !Number.isFinite(c_e252)) return null;
  if (!(c_e21 > 0) || !(c_e252 > 0)) return null;
  const mom121 = c_e21 / c_e252 - 1;
  const mom1 = c_e / c_e21 - 1;
  if (!Number.isFinite(mom121) || !Number.isFinite(mom1)) return null;
  let mean = 0;
  for (let idx = 0; idx < 252; idx++) mean += rets[idx];
  mean /= 252;
  let varSum = 0;
  for (let idx = 0; idx < 252; idx++) varSum += (rets[idx] - mean) * (rets[idx] - mean);
  const sd = Math.sqrt(varSum / 251);
  if (!Number.isFinite(sd)) return null;
  let maxHigh = -Infinity;
  for (let k = e - 251; k <= e; k++) {
    const h = b[k].high;
    if (!Number.isFinite(h)) return null;
    if (h > maxHigh) maxHigh = h;
  }
  if (!(maxHigh > 0)) return null;
  const highRatio = c_e / maxHigh;
  if (!Number.isFinite(highRatio)) return null;
  return { e, c_e, mom121, mom1, sd, highRatio, rets };
}

export function rank(universe, t, ctx) {
  const { lag, need, histMonths } = ctx.params;
  const syms = Object.keys(universe);
  const ewPresent = () => {
    const w = {};
    for (const s of syms) w[s] = 1 / syms.length;
    return w;
  };
  if (syms.length === 0) return {};

  if (ctx.state.sleeveHist === undefined) ctx.state.sleeveHist = { S1: [], S2: [], S3: [], S4: [], S5: [] };
  if (ctx.state.prevRecord === undefined) ctx.state.prevRecord = null;

  const info = {};
  for (const sym of syms) {
    const r = evalSymbol(universe[sym], lag, need);
    if (r) info[sym] = r;
  }
  const eligibleSyms = Object.keys(info);
  const M = eligibleSyms.length;
  if (M < 50) return ewPresent();

  const N = Math.max(10, Math.round(0.2 * M));

  // Market series m[idx] = mean over eligible names of that name's own return at the same
  // relative window position (idx=0 oldest .. idx=251 most recent). A consistent relabeling of
  // r(e_i - j) so the cov/var pairing below matches the spec exactly.
  const m = new Float64Array(252);
  for (let idx = 0; idx < 252; idx++) {
    let s = 0;
    for (const sym of eligibleSyms) s += info[sym].rets[idx];
    m[idx] = s / M;
  }
  let mMean = 0;
  for (let idx = 0; idx < 252; idx++) mMean += m[idx];
  mMean /= 252;
  let mVar = 0;
  for (let idx = 0; idx < 252; idx++) mVar += (m[idx] - mMean) * (m[idx] - mMean);
  mVar /= 252;
  for (const sym of eligibleSyms) {
    const rets = info[sym].rets;
    let rMean = 0;
    for (let idx = 0; idx < 252; idx++) rMean += rets[idx];
    rMean /= 252;
    let cov = 0;
    for (let idx = 0; idx < 252; idx++) cov += (rets[idx] - rMean) * (m[idx] - mMean);
    cov /= 252;
    info[sym].beta = mVar > 0 ? cov / mVar : 0;
  }

  const S1 = pickN(eligibleSyms.map((s) => ({ sym: s, val: info[s].mom121 })), N, true);
  const S2 = pickN(eligibleSyms.map((s) => ({ sym: s, val: info[s].mom1 })), N, false);
  const S3 = pickN(eligibleSyms.map((s) => ({ sym: s, val: info[s].sd })), N, false);
  const S4 = pickN(eligibleSyms.map((s) => ({ sym: s, val: info[s].highRatio })), N, true);
  const S5 = pickN(eligibleSyms.map((s) => ({ sym: s, val: info[s].beta })), N, false);
  const sleeveNames = { S1, S2, S3, S4, S5 };

  // (1) score the previous call's record, if any.
  if (ctx.state.prevRecord) {
    const prev = ctx.state.prevRecord;
    let mktSum = 0, mktCount = 0;
    for (const sym of Object.keys(prev.closes)) {
      if (!Object.hasOwn(universe, sym)) continue;
      const b = universe[sym];
      const e2 = b.length - lag;
      if (e2 < 0 || e2 >= b.length) continue;
      const cNow = b[e2].close;
      if (!Number.isFinite(cNow)) continue;
      mktSum += cNow / prev.closes[sym] - 1;
      mktCount++;
    }
    const mkt = mktCount > 0 ? mktSum / mktCount : 0;
    for (const sk of SLEEVE_KEYS) {
      let sum = 0, count = 0;
      for (const sym of prev.names[sk]) {
        if (!Object.hasOwn(universe, sym)) continue;
        const recordedClose = prev.closes[sym];
        if (recordedClose === undefined) continue;
        const b = universe[sym];
        const e2 = b.length - lag;
        if (e2 < 0 || e2 >= b.length) continue;
        const cNow = b[e2].close;
        if (!Number.isFinite(cNow)) continue;
        sum += cNow / recordedClose - 1;
        count++;
      }
      const ret_s = count > 0 ? sum / count : 0;
      const hist = ctx.state.sleeveHist[sk];
      hist.push({ ret: ret_s, mkt });
      while (hist.length > histMonths) hist.shift();
    }
  }

  // (2) record this call's sleeves and every eligible name's close, for next call's scoring.
  const closes = {};
  for (const sym of eligibleSyms) closes[sym] = info[sym].c_e;
  ctx.state.prevRecord = { names: sleeveNames, closes };

  const ready = SLEEVE_KEYS.every((sk) => ctx.state.sleeveHist[sk].length >= histMonths);
  if (!ready) return ewPresent();

  const exVals = {};
  for (const sk of SLEEVE_KEYS) {
    const entries = ctx.state.sleeveHist[sk].slice(-histMonths);
    let retProd = 1, mktProd = 1;
    for (const en of entries) { retProd *= 1 + en.ret; mktProd *= 1 + en.mkt; }
    exVals[sk] = retProd - mktProd;
  }
  const selected = SLEEVE_KEYS.filter((sk) => exVals[sk] > 0);
  if (selected.length === 0) return ewPresent();

  const w = {};
  const perSleeve = 1 / selected.length;
  for (const sk of selected) {
    const names = sleeveNames[sk];
    const per = perSleeve / names.length;
    for (const sym of names) w[sym] = (w[sym] || 0) + per;
  }
  return w;
}
