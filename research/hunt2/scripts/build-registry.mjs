// Regenerates the strategy registry and the public numbers from the ledger.
// Run: npm run research:registry
//
// Why this exists: the registry was hand-built by an agent each round, and the
// public claim drifted every time (it once counted 11 deep-validation CONTROL
// rows as strategies). Controls are excluded here, so registry.length IS the
// strategy count and there is no trap to fall into next round.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { register } from "tsx/esm/api";

register(); // ledger.mjs -> harness.mjs pulls in .ts; reuse its real BH gate instead of re-implementing it
const { computeLedger, Q_MAX } = await import("../../research/hunt2/ledger.mjs");
const { DISCOVERY_END } = await import("../../research/hunt2/data.mjs");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const p = (...s) => join(ROOT, ...s);
const isControl = (family) => /^deep-validation/.test(family ?? "");
const baseId = (id) => id.replace(/__rob\d+$/, "");

const rows = readFileSync(p("research/hunt2/ledger.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const latest = new Map();
for (const r of rows) latest.set(r.id, r); // later line wins
const live = [...latest.values()].filter((r) => !isControl(r.family));

const runs = live.length;                                  // every scored run, __robN included
const byBase = new Map();
for (const r of live) if (!byBase.has(baseId(r.id))) byBase.set(baseId(r.id), r);
const strategies = [...byBase.values()].sort((a, b) => a.id.localeCompare(b.id));

const verdict = (r) => (r.excessAnnual > 0 ? (r.pExcess < 0.05 ? "yes" : "not significant") : "no");
// Optional sweeps (scripts/research/cost-sweep.mjs, random-control-sweep.mjs). Their per-strategy
// numbers ride on the registry row so every public figure below still traces to one file.
const costSweep = existsSync(p("research/hunt2/cost-sweep.json")) ? JSON.parse(readFileSync(p("research/hunt2/cost-sweep.json"), "utf8")) : {};
const randomSweep = existsSync(p("research/hunt2/random-control-sweep.json")) ? JSON.parse(readFileSync(p("research/hunt2/random-control-sweep.json"), "utf8")) : null;
const registry = strategies.map((r) => {
  const cs = costSweep[r.id]?.sourceSha256 === r.sourceSha256 ? costSweep[r.id] : null;
  if (Object.keys(costSweep).length && !cs) console.warn(`NOTE: cost-sweep.json has no current row for ${r.id}; re-run scripts/research/cost-sweep.mjs`);
  return {
    id: baseId(r.id), name: r.name, family: r.family, assetClass: r.assetClass,
    source: r.source, evidencePath: `research/hunt2/results/${r.id}.json`,
    beatBuyHoldAfterCosts: verdict(r),
    excessAnnual: r.excessAnnual, pExcess: r.pExcess,
    /** excess/yr inside each half of the discovery window (same formula as excessAnnual). */
    halfExcess: r.halfExcess,
    ...(cs ? { excessAtZeroCost: cs.grid["0"].excessAnnual, breakevenCostPerSide: cs.breakevenCostPerSide, realCostPerSide: cs.realCostPerSide, costVerdict: cs.verdict } : {}),
  };
});
writeFileSync(p("research/STRATEGY-REGISTRY.json"), JSON.stringify(registry, null, 2) + "\n");
writeFileSync(p("public/research-registry.json"), JSON.stringify(
  registry.map(({ id, name, family, assetClass, beatBuyHoldAfterCosts }) => ({ id, name, family, assetClass, beatBuyHoldAfterCosts })),
) + "\n");

const families = new Set(strategies.map((r) => r.family)).size;
const ahead = strategies.filter((r) => r.excessAnnual > 0).length;
const significant = strategies.filter((r) => r.excessAnnual > 0 && r.pExcess < 0.05).length;
if (significant > 0) console.warn(`NOTE: ${significant} strategies are significant at p<0.05 before correction; the subline says so. If FDR_PASSED is ever > 0 the headline must be rewritten by hand.`);

// FDR family: the ledger's own gate over every non-control run that traded.
const fdr = computeLedger(rows.filter((r) => !isControl(r.family)));
const fdrPassed = fdr.rows.filter((r) => r.promising).length;
const minQ = Math.min(...fdr.rows.map((r) => r.q));
const lowestP = Math.min(...fdr.rows.map((r) => r.pExcess));
const sortedExcess = registry.map((r) => r.excessAnnual).sort((a, b) => a - b);
const mid = sortedExcess.length >> 1;
const medianExcess = sortedExcess.length % 2 ? sortedExcess[mid] : (sortedExcess[mid - 1] + sortedExcess[mid]) / 2;
const stamps = live.flatMap((r) => [r.ranAt, r.recomputedAt]).filter(Boolean).sort();
const day = (iso) => iso.slice(0, 10);
const round = (x, dp) => Number(x.toFixed(dp));

const familyLedger = [...new Set(registry.map((r) => r.family))].map((family) => {
  const inFam = registry.filter((r) => r.family === family);
  return {
    family,
    strategies: inFam.length,
    ahead: inFam.filter((r) => r.excessAnnual > 0).length,
    significant: inFam.filter((r) => r.beatBuyHoldAfterCosts === "yes").length,
    bestExcessAnnual: round(Math.max(...inFam.map((r) => r.excessAnnual)), 4),
    assetClasses: [...new Set(inFam.map((r) => r.assetClass))].sort(),
  };
}).sort((a, b) => b.strategies - a.strategies || a.family.localeCompare(b.family));
// Sign persistence across the two halves of the discovery window: under pure noise a strategy
// ahead in half 1 is ahead in half 2 about half the time.
const h1 = registry.filter((r) => Array.isArray(r.halfExcess) && r.halfExcess[0] > 0);
const halfPersistence = {
  aheadFirstHalf: h1.length,
  aheadBothHalves: h1.filter((r) => r.halfExcess[1] > 0).length,
  aheadSecondHalfOnly: registry.filter((r) => Array.isArray(r.halfExcess) && !(r.halfExcess[0] > 0) && r.halfExcess[1] > 0).length,
  aheadFullWindowAndBothHalves: registry.filter((r) => r.excessAnnual > 0 && Array.isArray(r.halfExcess) && r.halfExcess[0] > 0 && r.halfExcess[1] > 0).length,
};

const withCost = registry.filter((r) => r.costVerdict);
const med = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const costSummary = withCost.length ? {
  strategies: withCost.length,
  losesAtZeroCost: withCost.filter((r) => r.costVerdict === "loses_at_zero_cost").length,
  needsCheaper: withCost.filter((r) => r.costVerdict === "needs_cheaper").length,
  aheadAtRealCost: withCost.filter((r) => r.costVerdict === "ahead_at_real_cost").length,
  /** among needs_cheaper: real cost / breakeven cost, i.e. how many times cheaper execution would have to be */
  medianCostRatioNeedsCheaper: round(med(withCost.filter((r) => r.costVerdict === "needs_cheaper").map((r) => r.realCostPerSide / r.breakevenCostPerSide)) ?? 0, 2),
  medianExcessAtZeroCost: round(med(withCost.map((r) => r.excessAtZeroCost)), 4),
  byFamily: [...new Set(withCost.map((r) => r.family))].sort().map((family) => {
    const f = withCost.filter((r) => r.family === family);
    return { family, strategies: f.length, losesAtZeroCost: f.filter((r) => r.costVerdict === "loses_at_zero_cost").length,
      needsCheaper: f.filter((r) => r.costVerdict === "needs_cheaper").length, aheadAtRealCost: f.filter((r) => r.costVerdict === "ahead_at_real_cost").length,
      medianExcessAtZeroCost: round(med(f.map((r) => r.excessAtZeroCost)), 4) };
  }),
} : null;

const q = (xs, f) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? round(s[Math.min(s.length - 1, Math.floor(f * s.length))], 4) : null; };
const randomRows = (randomSweep?.rows ?? []).filter((r) => !r.rejected);
const randomSummary = randomRows.length ? {
  n: randomRows.length,
  rejected: (randomSweep.rows.length - randomRows.length),
  note: randomSweep.note,
  /** share of coin-flip strategies the test calls significant at p<0.05 (5% if the bootstrap is calibrated) */
  pBelow05: randomRows.filter((r) => r.pExcess < 0.05).length,
  aheadOfBuyHold: randomRows.filter((r) => r.excessAnnual > 0).length,
  /** both tails of the harness's exposure-matched random gate on coin flips: 5% each if that gate were calibrated */
  beats95PctOfControls: randomRows.filter((r) => r.randomPercentile >= 0.95).length,
  under5PctOfControls: randomRows.filter((r) => r.randomPercentile <= 0.05).length,
  byAssetClass: [...new Set(randomRows.map((r) => r.assetClass))].sort().map((cls) => {
    const rnd = randomRows.filter((r) => r.assetClass === cls).map((r) => r.excessAnnual);
    const tested = registry.filter((r) => r.assetClass === cls).map((r) => r.excessAnnual);
    const p95 = q(rnd, 0.95);
    const rr = randomRows.filter((r) => r.assetClass === cls);
    return { assetClass: cls, random: { n: rnd.length, p10: q(rnd, 0.1), p50: q(rnd, 0.5), p90: q(rnd, 0.9), p95, beats95PctOfControls: rr.filter((r) => r.randomPercentile >= 0.95).length, under5PctOfControls: rr.filter((r) => r.randomPercentile <= 0.05).length },
      tested: { n: tested.length, p10: q(tested, 0.1), p50: q(tested, 0.5), p90: q(tested, 0.9), aboveRandomP95: tested.filter((x) => x > p95).length, aboveRandomMedian: tested.filter((x) => x > q(rnd, 0.5)).length } };
  }),
} : null;

const byAsset = Object.fromEntries([...new Set(registry.map((r) => r.assetClass))].sort()
  .map((c) => [c, registry.filter((r) => r.assetClass === c).length]));

const stats = `// GENERATED by scripts/research/build-registry.mjs — do not hand-edit these numbers.
// Source of truth: research/hunt2/ledger.jsonl -> research/STRATEGY-REGISTRY.json
// (latest row per id, __robN reruns folded into their base id, deep-validation
// CONTROL rows excluded entirely). public/research-registry.json is the trimmed
// copy the landing page fetches. Re-run \`npm run research:registry\` after any new test.

export const STRATEGIES_TESTED = ${strategies.length}; // distinct strategies, controls excluded
export const STRATEGY_UNIT = "strategies";
export const STRATEGY_FAMILIES = ${families};
/** Individual scored runs behind those strategies (robustness reruns included). */
export const STRATEGY_TEST_RUNS = ${runs};
/** Strategies with a better point-estimate return than buy-and-hold after costs. */
export const STRATEGIES_AHEAD = ${ahead};
/** Strategies ahead of buy-and-hold with p < 0.05 before any multiple-testing correction. */
export const STRATEGIES_SIGNIFICANT = ${significant};
/** Median strategy's CAGR minus buy-and-hold CAGR (fraction per year, negative = behind). */
export const MEDIAN_EXCESS_ANNUAL = ${round(medianExcess, 4)};
export const STRATEGIES_BY_ASSET_CLASS: Record<string, number> = ${JSON.stringify(byAsset)};

/** Benjamini-Hochberg family: every distinct non-control run that traded (research/hunt2/ledger.mjs). */
export const FDR_TESTS = ${fdr.nTests};
export const FDR_Q_MAX = ${Q_MAX};
/** Runs that cleared the full gate (q, random controls, both halves, trades, net > 0, 2+ assets). */
export const FDR_PASSED = ${fdrPassed};
export const FDR_LOWEST_P = ${round(lowestP, 4)};
export const FDR_LOWEST_Q = ${round(minQ, 4)};

/** Last bar any test could see; everything after it is held back. */
export const DISCOVERY_END_DATE = "${new Date(DISCOVERY_END * 1000).toISOString().slice(0, 10)}";
export const LEDGER_FIRST_RUN = "${day(stamps[0])}";
export const LEDGER_LAST_UPDATED = "${day(stamps.at(-1))}";

/** Sign persistence of excess/yr between the two halves of the discovery window (from the registry's halfExcess). */
export const HALF_PERSISTENCE = ${JSON.stringify(halfPersistence)};

export type CostFamilyRow = { family: string; strategies: number; losesAtZeroCost: number; needsCheaper: number; aheadAtRealCost: number; medianExcessAtZeroCost: number };
/** Cost-to-breakeven (scripts/research/cost-sweep.mjs): each strategy re-run at 0/5/10/20bp per side; null until that sweep has run. */
export const COST_SWEEP: null | { strategies: number; losesAtZeroCost: number; needsCheaper: number; aheadAtRealCost: number; medianCostRatioNeedsCheaper: number; medianExcessAtZeroCost: number; byFamily: CostFamilyRow[] } = ${JSON.stringify(costSummary, null, 2)};

export type RandomClassRow = { assetClass: string; random: { n: number; p10: number; p50: number; p90: number; p95: number; beats95PctOfControls: number; under5PctOfControls: number }; tested: { n: number; p10: number; p50: number; p90: number; aboveRandomP95: number; aboveRandomMedian: number } };
/** Coin-flip strategies through the same harness (scripts/research/random-control-sweep.mjs), beside the tested ones; null until that sweep has run. */
export const RANDOM_CONTROL: null | { n: number; rejected: number; note: string; pBelow05: number; aheadOfBuyHold: number; beats95PctOfControls: number; under5PctOfControls: number; byAssetClass: RandomClassRow[] } = ${JSON.stringify(randomSummary, null, 2)};

export type FamilyLedgerRow = { family: string; strategies: number; ahead: number; significant: number; bestExcessAnnual: number; assetClasses: string[] };
export const FAMILY_LEDGER: FamilyLedgerRow[] = ${JSON.stringify(familyLedger, null, 2)};

export const RESEARCH_HEADLINE =
  "${strategies.length} strategies across ${families} families. None beat buy-and-hold after costs by more than luck would explain.";

export const RESEARCH_SUBLINE =
  "${strategies.length} distinct strategies across ${families} families, ${runs} scored runs, all backtested with real costs against buy-and-hold. ${ahead} finished ahead of buy-and-hold on the point estimate; ${significant === 0 ? "none were statistically significant" : `${significant} ${significant === 1 ? "was" : "were"} significant at p < 0.05 before correction`}, and none survived correction for testing this many strategies at once.";
`;
writeFileSync(p("src/data/researchStats.ts"), stats);

// index.html's source meta copy (what `vite dev` serves; prerender-meta rewrites dist from routeMeta)
// was hand-typed and drifted twice (217, 321). Derive it here too.
const indexHtml = readFileSync(p("index.html"), "utf8");
let indexHits = 0;
const syncedIndex = indexHtml
  .replace(/\d+ strategies backtested vs buy-and-hold: \d+ survived/g, () => (indexHits++, `${strategies.length} strategies backtested vs buy-and-hold: ${fdrPassed} survived`))
  .replace(/including the \d+ that failed/g, () => (indexHits++, `including the ${strategies.length} that failed`));
if (indexHits !== 3) console.warn(`NOTE: index.html meta count patterns matched ${indexHits} times, expected 3; check its description/og/twitter copy`);
writeFileSync(p("index.html"), syncedIndex);
if (costSummary) console.log(`cost sweep: ${costSummary.losesAtZeroCost} lose to B&H at zero cost, ${costSummary.needsCheaper} need cheaper execution (median ${costSummary.medianCostRatioNeedsCheaper}x), ${costSummary.aheadAtRealCost} ahead at real cost`);
if (randomSummary) console.log(`random control: ${randomSummary.n} coin-flip strategies, ${randomSummary.pBelow05} at p<0.05, ${randomSummary.aheadOfBuyHold} ahead of B&H, ${randomSummary.beats95PctOfControls} beat 95% of exposure-matched controls`);
console.log(`halves: ${halfPersistence.aheadBothHalves}/${halfPersistence.aheadFirstHalf} ahead in half 1 stayed ahead in half 2`);
console.log(`registry ${registry.length} strategies | ${families} families | ${runs} runs | ${ahead} ahead on point estimate | ${significant} significant | FDR ${fdr.nTests} tests, ${fdrPassed} passed, min q ${minQ}`);
