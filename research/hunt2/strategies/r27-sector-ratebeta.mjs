export const meta = {
  id: "r27-sector-ratebeta",
  name: "Sector rotation by beta to the yield-curve slope",
  family: "macro",
  source: "Bernanke & Kuttner 2005 JF (sector sensitivity to rate news); sweep150 t06-4; the deferred rule r25-rate-beta-sector-rotation frozen on 2026-09-25 (its beta, window and switch are taken as written; the weekly decision day and the data plumbing are fixed here)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLC", "VNQ"],
  rebalance: "daily",
  params: { betaWeeks: 52, minWeeks: 40, slopeLag: 63, top: 3, minNames: 6 },
};

// Week key of a time in seconds, Monday-start UTC weeks (same bucketing as ctx.resample("1w")).
function weekKeyOf(s) {
  return Math.floor((s / 86400 + 3) / 7);
}

function equalWeights(symbols) {
  const w = {};
  const n = symbols.length;
  for (const s of symbols) w[s] = 1 / n;
  return w;
}

// One rebalance-day decision: pick a mode ("EW" or "PICK") and, for PICK, the chosen sectors.
function decide(universe, present, weekKey, ctx) {
  const S = ctx.state.S;
  const betaWeeks = ctx.params.betaWeeks;
  const minWeeks = ctx.params.minWeeks;
  const slopeLag = ctx.params.slopeLag;
  const top = ctx.params.top;
  const minNames = ctx.params.minNames;

  // weekly T10Y2Y level: last observation seen in each completed week before this one.
  const yByWeek = new Map();
  for (const e of S) {
    const wk = weekKeyOf(e.t);
    if (wk < weekKey) yByWeek.set(wk, e.y);
  }
  const dyByWeek = new Map();
  for (const wk of yByWeek.keys()) {
    if (yByWeek.has(wk - 1)) dyByWeek.set(wk, yByWeek.get(wk) - yByWeek.get(wk - 1));
  }

  const betas = [];
  for (const sym of present) {
    const bars = universe[sym];
    const weeks = ctx.resample(bars, "1w").filter((wbar) => wbar.complete);
    const retByWeek = new Map();
    for (let k = 1; k < weeks.length; k++) {
      const cur = weeks[k];
      const prev = weeks[k - 1];
      const wkCur = weekKeyOf(cur.time);
      const wkPrev = weekKeyOf(prev.time);
      if (wkCur - wkPrev === 1) retByWeek.set(wkCur, cur.close / prev.close - 1);
    }
    const common = [];
    for (const wk of dyByWeek.keys()) {
      if (retByWeek.has(wk)) common.push(wk);
    }
    common.sort((a, b) => b - a); // latest weeks first
    const latest = common.slice(0, betaWeeks);
    if (latest.length < minWeeks) continue;
    let sumX = 0;
    let sumY = 0;
    const n = latest.length;
    for (const wk of latest) {
      sumX += dyByWeek.get(wk);
      sumY += retByWeek.get(wk);
    }
    const meanX = sumX / n;
    const meanY = sumY / n;
    let cov = 0;
    let varX = 0;
    for (const wk of latest) {
      const dx = dyByWeek.get(wk) - meanX;
      const dy2 = retByWeek.get(wk) - meanY;
      cov += dx * dy2;
      varX += dx * dx;
    }
    if (!(varX > 0) || !Number.isFinite(cov)) continue;
    betas.push([sym, cov / varX]);
  }

  if (betas.length < minNames) {
    ctx.state.mode = "EW";
    ctx.state.picks = null;
    return;
  }

  const last = S.length - 1;
  const steep = S.length >= slopeLag + 1 && S[last].y - S[last - slopeLag].y > 0;

  const ascByBeta = (a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1);
  const descByBeta = (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1);
  const ordered = steep ? [...betas].sort(descByBeta) : [...betas].sort(ascByBeta);
  ctx.state.mode = "PICK";
  ctx.state.picks = ordered.slice(0, top).map((p) => p[0]);
}

function currentWeights(universe, present, ctx) {
  if (ctx.state.mode === "PICK" && ctx.state.picks) {
    const alive = ctx.state.picks.filter((s) => Object.hasOwn(universe, s));
    if (alive.length) return equalWeights(alive);
  }
  return equalWeights(present);
}

export function rank(universe, t, ctx) {
  if (ctx.state.S === undefined) {
    ctx.state.S = [];
    ctx.state.lastWeekKey = undefined;
    ctx.state.mode = "EW";
    ctx.state.picks = null;
  }

  const y = ctx.macro("T10Y2Y");
  if (y !== null) ctx.state.S.push({ t, y });

  const present = Object.keys(universe).sort();
  const weekKey = weekKeyOf(t);

  if (ctx.state.lastWeekKey === undefined || weekKey !== ctx.state.lastWeekKey) {
    ctx.state.lastWeekKey = weekKey;
    decide(universe, present, weekKey, ctx);
  }

  if (!present.length) return {};
  return currentWeights(universe, present, ctx);
}
