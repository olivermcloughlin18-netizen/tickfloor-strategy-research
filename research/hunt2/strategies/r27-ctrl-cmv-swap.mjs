// prereg-2026-09-27 mechanism control: r27-wide-cmv-beta with even and odd weeks swapped (Lo book in even weeks, H book in odd weeks).
// prereg C7 r27: FOMC-cycle beta rotation, wide us-equity universe.
// Cieslak, Morse & Vissing-Jorgensen 2019 JF 'Stock returns over the FOMC cycle': even
// weeks of the FOMC cycle earn higher average excess returns than odd weeks. Rotates
// into the N highest-beta names (vs the book's own EW return) on even weeks, the N
// lowest-beta names on odd weeks.
// FOMC dates copied byte-for-byte from calendar-fomc-drift.mjs, minus the unscheduled
// emergency cut 2020-03-03 (Cieslak et al. use only scheduled meetings).
const FOMC_DATES = [
  "2016-01-27","2016-03-16","2016-04-27","2016-06-15","2016-07-27","2016-09-21","2016-11-02","2016-12-14",
  "2017-02-01","2017-03-15","2017-05-03","2017-06-14","2017-07-26","2017-09-20","2017-11-01","2017-12-13",
  "2018-01-31","2018-03-21","2018-05-02","2018-06-13","2018-08-01","2018-09-26","2018-11-08","2018-12-19",
  "2019-01-30","2019-03-20","2019-05-01","2019-06-19","2019-07-31","2019-09-18","2019-10-30","2019-12-11",
  "2020-01-29","2020-03-15","2020-04-29","2020-06-10","2020-07-29","2020-09-16","2020-11-05","2020-12-16",
  "2021-01-27","2021-03-17","2021-04-28","2021-06-16","2021-07-28","2021-09-22","2021-11-03","2021-12-15",
  "2022-01-26","2022-03-16","2022-05-04","2022-06-15","2022-07-27","2022-09-21","2022-11-02","2022-12-14",
  "2023-02-01","2023-03-22","2023-05-03","2023-06-14","2023-07-26","2023-09-20","2023-11-01","2023-12-13",
  "2024-01-31","2024-03-20","2024-05-01","2024-06-12","2024-07-31","2024-09-18","2024-11-07","2024-12-18",
  "2025-01-29","2025-03-19",
];

function dayNumFromYmd(s) {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}
const FOMC_DAYS = FOMC_DATES.map(dayNumFromYmd).sort((a, b) => a - b);
const CUTOFF_DAY = dayNumFromYmd("2016-01-26");

function isWeekday(x) {
  const w = ((x + 4) % 7 + 7) % 7;
  return w >= 1 && w <= 5;
}

// count of weekdays x with a < x <= b
function wd(a, b) {
  let c = 0;
  for (let x = a + 1; x <= b; x++) if (isWeekday(x)) c++;
  return c;
}

export const meta = {
  id: "r27-ctrl-cmv-swap",
  name: "Control: FOMC-cycle beta tilt with even and odd weeks swapped (wide US stocks)",
  family: "deep-validation-control",
  source: "Cieslak, Morse & Vissing-Jorgensen 2019 JF 'Stock returns over the FOMC cycle'. Cost: about 50 full book switches a year, roughly 5%/yr at 0.05%/side.",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "daily",
  params: { lag: 2, betaWindow: 252, need: 254 },
};

function ewPresent(universe) {
  const syms = Object.keys(universe);
  const w = {};
  if (syms.length === 0) return w;
  const wt = 1 / syms.length;
  for (const s of syms) w[s] = wt;
  return w;
}

// EW over a stored symbol list, restricted to symbols present in today's universe.
// null when none of them are present, so the caller falls back to ewPresent.
function ewOver(list, universe) {
  const present = list.filter((s) => universe[s] !== undefined);
  if (present.length === 0) return null;
  const w = {};
  const wt = 1 / present.length;
  for (const s of present) w[s] = wt;
  return w;
}

export function rank(universe, t, ctx) {
  const { betaWindow, need } = ctx.params;
  const syms = Object.keys(universe).sort();

  // -- first call of each calendar month: rebuild the high/low-beta books --
  const d = new Date(t * 1000);
  const monthKey = d.getUTCFullYear() * 12 + d.getUTCMonth();
  if (ctx.state.monthKey === undefined || monthKey !== ctx.state.monthKey) {
    ctx.state.monthKey = monthKey;

    // eligible = L >= need and every one of the 252 lagged returns used is finite
    const eligible = [];
    for (const sym of syms) {
      const b = universe[sym];
      const L = b.length;
      if (L < need) continue;
      const e = L - 2;
      const rets = new Array(betaWindow);
      let ok = true;
      for (let j = 0; j < betaWindow; j++) {
        const k = e - j;
        if (k < 1) { ok = false; break; }
        const r = b[k].close / b[k - 1].close - 1;
        if (!Number.isFinite(r)) { ok = false; break; }
        rets[j] = r;
      }
      if (ok) eligible.push({ sym, rets });
    }
    const M = eligible.length;

    if (M >= 50) {
      const N = Math.max(10, Math.round(0.2 * M));

      // EW market return at lag j, each name's own return aligned by its own position
      const m = new Array(betaWindow).fill(0);
      for (const { rets } of eligible) for (let j = 0; j < betaWindow; j++) m[j] += rets[j];
      for (let j = 0; j < betaWindow; j++) m[j] /= M;
      const meanM = m.reduce((p, q) => p + q, 0) / betaWindow;
      let varM = 0;
      for (let j = 0; j < betaWindow; j++) varM += (m[j] - meanM) ** 2;

      if (varM > 0 && Number.isFinite(varM)) {
        const bySym = (a, b2) => (a[0] < b2[0] ? -1 : a[0] > b2[0] ? 1 : 0);
        const rows = [];
        for (const { sym, rets } of eligible) {
          const meanR = rets.reduce((p, q) => p + q, 0) / betaWindow;
          let cov = 0;
          for (let j = 0; j < betaWindow; j++) cov += (rets[j] - meanR) * (m[j] - meanM);
          const beta = cov / varM;
          if (Number.isFinite(beta)) rows.push([sym, beta]);
        }
        const desc = rows.slice().sort((a, b2) => b2[1] - a[1] || bySym(a, b2));
        const asc = rows.slice().sort((a, b2) => a[1] - b2[1] || bySym(a, b2));
        ctx.state.H = desc.slice(0, N).map(([s]) => s);
        ctx.state.Lo = asc.slice(0, N).map(([s]) => s);
      }
      // degenerate (zero/non-finite) market variance: store nothing, same as M < 50
    }
    // M < 50: store nothing; any previously stored H/Lo is left as-is
  }

  // -- FOMC week parity for D, the session the new weights earn --
  const T = Math.trunc(t / 86400);
  let D = T + 1;
  while (!isWeekday(D)) D++;

  if (D < CUTOFF_DAY) return ewPresent(universe); // no verified FOMC dates before this -> neutral

  let dn;
  for (let i = 0; i < FOMC_DAYS.length; i++) {
    if (FOMC_DAYS[i] >= D) { dn = FOMC_DAYS[i]; break; }
  }
  let week;
  if (dn !== undefined && wd(D, dn) === 1) {
    week = 0;
  } else {
    let dp;
    for (let i = FOMC_DAYS.length - 1; i >= 0; i--) {
      if (FOMC_DAYS[i] <= D) { dp = FOMC_DAYS[i]; break; }
    }
    if (dp === undefined) return ewPresent(universe); // ponytail: no FOMC day on/before D, safety fallback
    const k = wd(dp, D);
    week = k <= 3 ? 0 : 1 + Math.floor((k - 4) / 5);
  }
  const evenWeek = week % 2 === 0;

  if (ctx.state.H === undefined) return ewPresent(universe); // nothing stored yet

  const picked = evenWeek ? ewOver(ctx.state.Lo, universe) : ewOver(ctx.state.H, universe);
  return picked === null ? ewPresent(universe) : picked;
}
