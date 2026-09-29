// EDGE strategy hunt v2 — global ledger. BH-FDR over EVERY distinct test that produced
// trades (the family grows as agents test more), then two SEPARATE verdict tracks:
//   PROMISING      beats buy&hold on net return (a candidate edge)
//   RISK_IMPROVER  gives up some return for materially better risk (NOT an edge)
//   node --import tsx research/hunt2/ledger.mjs                        leaderboards (latest run per id)
//   node --import tsx research/hunt2/ledger.mjs --all                  every distinct run, not just the latest per id
//   node --import tsx research/hunt2/ledger.mjs --verify               re-run every latest strategy and check its ledger numbers
//   node --import tsx research/hunt2/ledger.mjs --recompute [--shard k/N]   rebuild every row from its stored source (see CHANGELOG.md)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { evaluate, readLedgerLines, ledgerEntry, writeRun, MIN_TRADES, METRICS_VERSION, LEDGER_PATH, RESULTS_DIR, SOURCES_DIR } from "./harness.mjs";

export const Q_MAX = 0.10;
const ROOT = path.resolve(import.meta.dirname, "../..");
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

/** Benjamini-Hochberg adjusted p-values (q), in input order. */
export function bhAdjust(ps) {
  const m = ps.length;
  const order = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]);
  const q = new Array(m);
  let run = 1;
  for (let r = m - 1; r >= 0; r--) {
    run = Math.min(run, (order[r][0] * m) / (r + 1));
    q[order[r][1]] = run;
  }
  return q;
}
const pOr1 = (p) => (Number.isFinite(p) && p >= 0 && p <= 1 ? p : 1);

export function edgeFails(r) {
  const f = [];
  if (!(r.q < Q_MAX)) f.push("q");
  if (!(r.randomPercentile >= 0.95)) f.push("random");
  if (!(Array.isArray(r.halfExcess) && r.halfExcess[0] > 0 && r.halfExcess[1] > 0)) f.push("halves");
  if (r.mode === "portfolio" ? !(r.rebalances >= 36) : !(r.trades >= 30)) f.push("trades");
  if (!(r.cagr > 0)) f.push("net<=0");
  if (!(r.nAssets >= 2)) f.push("1asset");
  return f;
}
export function riskFails(r) {
  const f = [];
  if (!(r.qSharpe < Q_MAX)) f.push("q");
  if (!(r.sharpe > r.bhSharpe)) f.push("sharpe");
  if (!(r.maxDD <= 0.75 * r.bhMaxDD)) f.push("dd");
  if (!(r.cagr >= 0.6 * r.bhCagr)) f.push("cagr");
  if (!(Array.isArray(r.halfSharpeDiff) && r.halfSharpeDiff[0] > 0 && r.halfSharpeDiff[1] > 0)) f.push("halves");
  if (!(r.nAssets >= 2)) f.push("1asset");
  if (!(r.randomSharpePercentile >= 0.95)) f.push("random");
  return f;
}

export function computeLedger(entries) {
  // <MIN_TRADES runs are implementation failures (the harness now rejects them), not tests.
  const valid = entries.filter((e) => e.trades >= MIN_TRADES);
  // an identical re-run (same source, data, harness) is one test, not two;
  // a changed source under the same id IS a new test (that is tuning)
  const uniq = new Map();
  for (const e of valid) uniq.set(`${e.sourceSha256}|${e.dataSha256}|${e.harnessSha256}`, e);
  const rows = [...uniq.values()].map((e) => ({ ...e, legacy: !(e.metricsVersion >= METRICS_VERSION) }));
  const q = bhAdjust(rows.map((r) => pOr1(r.pExcess)));
  const qS = bhAdjust(rows.map((r) => pOr1(r.pSharpe)));
  const attempts = new Map();
  rows.forEach((r, i) => {
    r.q = q[i];
    r.qSharpe = qS[i];
    r.fails = edgeFails(r);
    r.riskFails = riskFails(r);
    r.promising = r.fails.length === 0;
    r.riskImprover = !r.promising && r.riskFails.length === 0;
    attempts.set(r.id, (attempts.get(r.id) ?? 0) + 1);
  });
  const latestById = new Map();
  for (const r of rows) { r.attempts = attempts.get(r.id); const cur = latestById.get(r.id); if (!cur || r.ranAt >= cur.ranAt) latestById.set(r.id, r); }
  const byEdge = (a, b) => a.q - b.q || a.pExcess - b.pExcess;
  rows.sort(byEdge);
  const latest = [...latestById.values()].sort(byEdge);
  return { nTests: rows.length, nRaw: entries.length, nNoTrades: entries.length - valid.length, nIds: latest.length, rows, latest };
}

const pct = (x, d = 1) => (Number.isFinite(x) ? `${(x * 100).toFixed(d)}%` : "n/a");
const pp = (x) => (Number.isFinite(x) ? `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}pp` : "n/a");
const ex = (x) => (Number.isFinite(x) ? Number(x).toExponential(2) : "n/a");
const verdict = (r) => (r.legacy ? "LEGACY(v1 metrics)" : r.promising ? "PROMISING" : r.riskImprover ? "RISK_IMPROVER" : null);
function table(head, lines) {
  const w = head.map((h, c) => Math.max(h.length, ...lines.map((l) => l[c].length)));
  for (const l of [head, ...lines]) console.log(l.map((x, c) => x.padEnd(w[c])).join("  "));
}
export function printLeaderboard(led, { all = false } = {}) {
  const list = all ? led.rows : led.latest;
  console.log(`LEDGER ${led.nRaw} raw rows, ${led.nNoTrades} with <${MIN_TRADES} trades dropped (implementation failures), ${led.nTests} distinct tests across ${led.nIds} ids; BH-FDR q<${Q_MAX} over all ${led.nTests}`);
  console.log(`Showing ${all ? "every distinct run" : "the latest run per id"}; att = distinct runs of that id (each one counts in the FDR family). excess/yr = CAGR(strategy) - CAGR(buy&hold) in percentage points.`);
  console.log(`\nTRACK 1 — EDGE. PROMISING = q<${Q_MAX} on log excess vs buy&hold + beats >=95% random (log return) + excess>0 both halves + >=30 trades (portfolio: >=36 rebalances) + net CAGR>0 + >=2 assets`);
  table(["#", "id", "family", "mode", "n", "att", "q", "p", "excess/yr", "CAGR", "B&H CAGR", "Sharpe", "maxDD", "trades", "rand%", "half1", "half2", "verdict"],
    list.map((r, i) => [
      i + 1, r.id, r.family, r.mode, r.nAssets, r.attempts, ex(r.q), ex(r.pExcess), pp(r.excessAnnual), pct(r.cagr), pct(r.bhCagr),
      Number(r.sharpe).toFixed(2), pct(r.maxDD, 0), r.mode === "portfolio" ? `${r.rebalances}rb` : r.trades, pct(r.randomPercentile, 0),
      pp(r.halfExcess?.[0]), pp(r.halfExcess?.[1]), verdict(r) ?? `fail:${r.fails.join("+")}`,
    ].map(String)));
  console.log(`\nTRACK 2 — RISK_IMPROVER (NOT an edge: lower return, better risk). = q<${Q_MAX} on bootstrap Sharpe(strategy)-Sharpe(B&H) + Sharpe>B&H + maxDD <=75% of B&H + CAGR >=60% of B&H CAGR + Sharpe better in both halves + >=2 assets + beats >=95% of exposure-matched random on Sharpe`);
  const risk = list.slice().sort((a, b) => a.qSharpe - b.qSharpe || pOr1(a.pSharpe) - pOr1(b.pSharpe));
  table(["#", "id", "n", "att", "qSharpe", "pSharpe", "Sharpe", "B&H Sh", "maxDD", "B&H DD", "CAGR", "B&H CAGR", "randSh%", "hSh1", "hSh2", "verdict"],
    risk.map((r, i) => [
      i + 1, r.id, r.nAssets, r.attempts, ex(r.qSharpe), ex(r.pSharpe), Number(r.sharpe).toFixed(2), Number(r.bhSharpe).toFixed(2), pct(r.maxDD, 0), pct(r.bhMaxDD, 0),
      pct(r.cagr), pct(r.bhCagr), pct(r.randomSharpePercentile, 0),
      Number.isFinite(r.halfSharpeDiff?.[0]) ? r.halfSharpeDiff[0].toFixed(2) : "n/a", Number.isFinite(r.halfSharpeDiff?.[1]) ? r.halfSharpeDiff[1].toFixed(2) : "n/a",
      r.legacy ? "LEGACY(v1 metrics)" : r.riskImprover ? "RISK_IMPROVER" : r.promising ? "PROMISING(track 1)" : `fail:${r.riskFails.join("+")}`,
    ].map(String)));
}

/** The exact source of a ledger row: the content-addressed snapshot, else the strategy file if it still matches. */
function sourceFileFor(e) {
  for (const f of [path.join(SOURCES_DIR, e.sourceSha256, `${e.id}.mjs`), path.join(ROOT, e.strategyPath ?? "")]) {
    if (fs.existsSync(f) && fs.statSync(f).isFile() && sha(fs.readFileSync(f, "utf8")) === e.sourceSha256) return f;
  }
  return null;
}

async function verify(led) {
  for (const r of led.latest) {
    const f = sourceFileFor(r);
    let status;
    if (!f) status = "SOURCE MISSING (no snapshot, file changed)";
    else {
      try {
        const x = await evaluate(f, { write: false });
        const same = x.dataSha256 === r.dataSha256 && x.excess.p === r.pExcess && x.portfolio.cagr === r.cagr && x.sharpeTest.p === r.pSharpe && x.randomControl.percentile === r.randomPercentile;
        status = same ? "OK reproduced" : x.harnessSha256 !== r.harnessSha256 ? "harness changed since run (not comparable)" : `MISMATCH p ${r.pExcess} vs ${x.excess.p}, cagr ${r.cagr} vs ${x.portfolio.cagr}`;
      } catch (e) {
        status = `RERUN FAILED ${e.message}`;
      }
    }
    console.log(`verify ${r.id}: ${status}`);
  }
}

/**
 * Rebuild the ledger under the current harness. Each distinct source is re-run from its stored
 * copy; per-source outcomes are cached in results/.recompute/ so shards can run in parallel.
 * Sources that no longer exist are kept as LEGACY rows (they still count in the FDR family if they traded).
 */
async function recompute(shard) {
  const cacheDir = path.join(RESULTS_DIR, ".recompute");
  fs.mkdirSync(cacheDir, { recursive: true });
  const old = readLedgerLines();
  const bySrc = new Map();
  for (const e of old.slice().sort((a, b) => (a.ranAt < b.ranAt ? -1 : 1))) bySrc.set(e.sourceSha256, e); // latest row per source
  const list = [...bySrc.values()].sort((a, b) => (a.ranAt < b.ranAt ? -1 : 1));
  const [k, N] = shard ?? [0, 1];
  for (let j = 0; j < list.length; j++) {
    if (j % N !== k) continue;
    const e = list[j];
    const out = path.join(cacheDir, `${e.sourceSha256}.json`);
    if (fs.existsSync(out)) continue;
    const f = sourceFileFor(e);
    let rec;
    if (!f) rec = { kind: "legacy" };
    else {
      const t0 = Date.now();
      try {
        const r = await evaluate(f, { write: false });
        r.ranAt = e.ranAt;
        r.recomputedAt = new Date().toISOString();
        rec = { kind: "ok", result: r, source: fs.readFileSync(f, "utf8") };
      } catch (err) {
        rec = { kind: "rejected", message: err.message };
      }
      console.log(`recompute ${e.id} ${e.sourceSha256.slice(0, 8)}: ${rec.kind}${rec.message ? ` — ${rec.message.slice(0, 120)}` : ""} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
    fs.writeFileSync(out, JSON.stringify(rec));
  }
  if (shard) return;
  const backup = path.join(path.dirname(LEDGER_PATH), "ledger.v1.jsonl");
  if (!fs.existsSync(backup)) fs.copyFileSync(LEDGER_PATH, backup);
  const lines = [];
  const counts = { ok: 0, rejected: 0, legacy: 0, legacyDropped: 0 };
  for (const e of list) {
    const rec = JSON.parse(fs.readFileSync(path.join(cacheDir, `${e.sourceSha256}.json`), "utf8"));
    if (rec.kind === "ok") {
      writeRun(rec.result, rec.source); // list is in ranAt order, so results/<id>.json ends as the latest run
      lines.push({ ...ledgerEntry(rec.result, rec.result.resultPath), recomputedAt: rec.result.recomputedAt });
      counts.ok++;
    } else if (rec.kind === "rejected") counts.rejected++;
    else if (e.trades >= MIN_TRADES) { lines.push({ ...e, legacyNote: "v1 metrics (arithmetic excess); source not stored, cannot be recomputed" }); counts.legacy++; }
    else counts.legacyDropped++;
  }
  const tmp = `${LEDGER_PATH}.tmp`;
  fs.writeFileSync(tmp, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  fs.renameSync(tmp, LEDGER_PATH);
  console.log(`recompute: ${list.length} distinct sources -> ${counts.ok} recomputed, ${counts.rejected} now rejected (not ledgered), ${counts.legacy} legacy rows kept (traded, source lost), ${counts.legacyDropped} legacy rows dropped (<${MIN_TRADES} trades). v1 ledger at ${path.relative(ROOT, backup)}`);
}

if (process.argv[1] === import.meta.filename) {
  const args = process.argv.slice(2);
  if (args.includes("--recompute")) {
    const s = args[args.indexOf("--shard") + 1];
    await recompute(args.includes("--shard") ? s.split("/").map(Number) : null);
    if (args.includes("--shard")) process.exit(0);
  }
  const led = computeLedger(readLedgerLines());
  printLeaderboard(led, { all: args.includes("--all") });
  if (args.includes("--verify")) await verify(led);
}
