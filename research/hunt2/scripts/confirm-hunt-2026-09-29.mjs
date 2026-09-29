// One-shot confirmatory holdout exam of the 0929 robustness survivors (research/hunt2/prereg-0929.md).
//   node --import tsx scripts/research/confirm-hunt-2026-09-29.mjs --self-check   discovery data only, fetch blocked
//   node --import tsx scripts/research/confirm-hunt-2026-09-29.mjs --preregister  appends the CONFIRMATORY lines to the holdout log
//   node --import tsx scripts/research/confirm-hunt-2026-09-29.mjs --run          guards, self-check, fetch, score (once)
// Scoring reuses the hunt2 harness itself: a runtime copy of research/hunt2/harness.mjs with two patches
// (random-control seeds 200 -> 2, and the daily R/B/days of evaluate() captured), fed spliced bars through
// evaluate()'s own `data` override. The self-check proves on discovery data that this path reproduces the
// unpatched evaluate() to 1e-9 before any holdout byte is fetched.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { DISCOVERY_END, UNIVERSES, loadBars } from '../../research/hunt2/data.mjs';
import { evaluate as evaluateHarness } from '../../research/hunt2/harness.mjs';
import { blockBootstrapPValueRefined } from '../../src/lib/quant/stats.ts';
import { logHoldoutUse } from '../../src/lib/quant/holdout.ts';

const ROOT = path.resolve(import.meta.dirname, '../..');
const H2 = path.join(ROOT, 'research/hunt2');
const rel = f => path.relative(ROOT, f);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const DAY = 86400;
const iso = d => new Date(d * DAY * 1000).toISOString().slice(0, 10);
const lg = r => Math.log(Math.max(1 + r, 1e-12)); // same floor as harness.mjs

// ---- frozen by research/hunt2/prereg-0929.md ----
const PREREG = 'research/hunt2/prereg-0929.md';
const HOLDOUT_LOG = 'docs_holdout_log.txt'; // the canonical log (integrate/0927)
const FROZEN = { harness: '8da0f9bf1d2284b55a3b30c8693f1310afe6290809889392989e829e74f3946e', data: '7439f80136985e388c943fbbd5adcf3fe795c588b2dfce40aff9a30d2e71ec3d' };
const CANDS = [
  { id: 'r25-crypto-btcbeta-low', sha: '7557c69f126a50147b072083ad5cfe2e7f3c2b4a3bea8d160183bacae6fbec91', ctrl: 'dv-ctrl-r25-crypto-btcbeta-low', ctrlSha: 'a27354b796977863263a0face9cdc908b5d680b8921f4587a7c0d6eb5499a2d5' },
  { id: 'r27-crypto-scaled-trend', sha: '2940d6945243df19fcc77f10bfd4f9e74c9124caeb4e2e1ac4ff6897bd1f7f9d', ctrl: 'dv-ctrl-r27-crypto-scaled-trend', ctrlSha: '1ab5a10e883e2c28c2faf9868a575e20cfd708c9c84fd899f95d25e08e6da8c9' },
];
const K = CANDS.length;
const ALPHA = 0.05 / K; // Bonferroni, one-sided
const SYMBOLS = UNIVERSES.CRYPTO_DAILY;
const tag = id => `CONFIRMATORY ${id} prereg-0929`;
const OUT = path.join(H2, 'holdout-exam-0929.json');
const DATA_OUT = path.join(H2, 'holdout-exam-0929.data.json.gz');
const file = id => path.join(H2, 'strategies', `${id}.mjs`);

function checkFrozen() {
  assert.equal(sha(fs.readFileSync(path.join(H2, 'harness.mjs'), 'utf8')), FROZEN.harness, 'harness.mjs changed since the prereg');
  assert.equal(sha(fs.readFileSync(path.join(H2, 'data.mjs'), 'utf8')), FROZEN.data, 'data.mjs changed since the prereg');
  for (const c of CANDS) {
    assert.equal(sha(fs.readFileSync(file(c.id), 'utf8')), c.sha, `${c.id} is not the frozen file`);
    assert.equal(sha(fs.readFileSync(file(c.ctrl), 'utf8')), c.ctrlSha, `${c.ctrl} is not the frozen file`);
  }
}

// ---- the harness, patched only to hand back its daily series ----
let H, patchedSha256;
async function harness() {
  if (H) return H;
  let s = fs.readFileSync(path.join(H2, 'harness.mjs'), 'utf8');
  assert.equal(sha(s), FROZEN.harness);
  const sub = (a, b) => { assert(s.includes(a), `patch anchor missing: ${a.slice(0, 50)}`); s = s.replace(a, b); };
  sub('const SEEDS = 200;', 'const SEEDS = 2; // confirm copy: random control not used');
  sub('  const { days, R, B } = run;\n', '  const { days, R, B } = run;\n  globalThis.__HC_OUT = { days, R, B };\n');
  const dst = path.join(H2, 'harness-confirm.mjs'); // generated, untracked (like harness-battery.mjs)
  fs.writeFileSync(dst, s);
  H = await import(pathToFileURL(dst).href);
  patchedSha256 = sha(s);
  return H;
}

async function runOn(id, data) {
  const h = await harness();
  globalThis.__HC_OUT = null;
  const r = await h.evaluate(file(id), { data });
  const o = globalThis.__HC_OUT;
  assert(o && o.R.length === r.period.returnDays, 'capture failed');
  return { r, ...o };
}

const isRebalance = (day, next, freq) => freq === 'daily' ? true
  : freq === 'weekly' ? Math.floor((day + 3) / 7) !== Math.floor((next + 3) / 7)
  : new Date(day * DAY * 1000).getUTCMonth() !== new Date(next * DAY * 1000).getUTCMonth(); // harness isRebalance

/** Score return days k0.. of one evaluate() path. */
function summarize({ r, days, R, B }, k0) {
  const Rs = R.subarray(k0), Bs = B.subarray(k0), ds = days.slice(k0);
  const s = H.metrics(Rs, ds), b = H.metrics(Bs, ds);
  const boot = blockBootstrapPValueRefined(Array.from(Rs, (x, k) => lg(x) - lg(Bs[k])), { seed: 42 });
  const sh = H.sharpeDiffPValue(Rs, Bs, boot.blockLen);
  const freq = r.meta.rebalance ?? 'monthly';
  let rebalances = 0;
  for (let k = k0 - 1; k < days.length - 1; k++) if (k >= 0 && isRebalance(days[k], days[k + 1], freq)) rebalances++; // decisions whose book is held on a scored day
  return {
    cagr: s.cagr, bhCagr: b.cagr, excessAnnual: s.cagr - b.cagr, p: boot.p,
    bootstrap: { iters: boot.iters, blockLen: boot.blockLen, floor: boot.floor, effectiveN: boot.effectiveN, seed: 42 },
    sharpe: s.sharpe, bhSharpe: b.sharpe, pSharpe: sh.p, maxDD: s.maxDD, bhMaxDD: b.maxDD, totalReturn: s.totalReturn, bhTotalReturn: b.totalReturn,
    days: s.days, years: s.years, firstDay: iso(ds[0]), lastDay: iso(ds.at(-1)), rebalances,
  };
}

// ---- self-check on discovery data (no network) ----
async function selfCheck() {
  checkFrozen();
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('BLOCKED: self-check is discovery-only'); };
  try {
    const data = {};
    for (const s of SYMBOLS) data[s] = await loadBars(s, '1d');
    const out = {};
    for (const id of CANDS.flatMap(c => [c.id, c.ctrl])) {
      const mine = await runOn(id, data);
      const ref = await evaluateHarness(file(id), { write: false });
      for (const [a, b, what] of [[mine.r.portfolio.cagr, ref.portfolio.cagr, 'CAGR'], [mine.r.portfolio.sharpe, ref.portfolio.sharpe, 'Sharpe'], [mine.r.portfolio.maxDD, ref.portfolio.maxDD, 'maxDD'], [mine.r.benchmark.cagr, ref.benchmark.cagr, 'B&H CAGR'], [mine.r.excess.p, ref.excess.p, 'p']]) {
        assert(Math.abs(a - b) <= 1e-9, `${id}: ${what} ${a} vs evaluate() ${b}`);
      }
      // scoring from k0 = 1 must be evaluate()'s own full-window numbers
      const full = summarize(mine, 0);
      assert(Math.abs(full.cagr - ref.portfolio.cagr) <= 1e-9 && Math.abs(full.bhCagr - ref.benchmark.cagr) <= 1e-9 && full.p === ref.excess.p, `${id}: summarize() does not reproduce evaluate()`);
      // a mid-window slice must equal metrics() over the same range of the full path
      const k = mine.days.length >> 1, cut = summarize(mine, k), m = H.metrics(mine.R, mine.days, k, mine.R.length);
      assert(Math.abs(cut.cagr - m.cagr) <= 1e-12 && cut.days === mine.R.length - k, `${id}: slice mismatch`);
      out[id] = { cagr: mine.r.portfolio.cagr, evaluateCagr: ref.portfolio.cagr, bhCagr: mine.r.benchmark.cagr, p: mine.r.excess.p, returnDays: mine.R.length, period: mine.r.period };
      console.log(`self-check ${id}: CAGR ${mine.r.portfolio.cagr} = evaluate() ${ref.portfolio.cagr}; B&H ${mine.r.benchmark.cagr}; p ${mine.r.excess.p}; slice OK`);
    }
    return out;
  } finally { globalThis.fetch = realFetch; }
}

// ---- holdout data: data.binance.vision spot 1d klines (the discovery cache's exchange) ----
const pad = x => String(x).padStart(2, '0');
async function vision(symbol, nowSec) {
  const base = 'https://data.binance.vision/data/spot';
  const urls = [];
  for (let y = 2025; y <= 2026; y++) for (let m = 1; m <= 12; m++) if ((y > 2025 || m >= 2) && (y < 2026 || m <= 8)) urls.push(`${base}/monthly/klines/${symbol}/1d/${symbol}-1d-${y}-${pad(m)}.zip`);
  for (let d = 1; d <= 30; d++) if (Date.UTC(2026, 8, d) / 1000 + DAY <= nowSec) urls.push(`${base}/daily/klines/${symbol}/1d/${symbol}-1d-2026-09-${pad(d)}.zip`);
  const out = [], missing = [];
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async (_, w) => {
    const tmp = path.join(os.tmpdir(), `confirm-0929-${process.pid}-${w}.zip`);
    while (next < urls.length) {
      const u = urls[next++];
      for (let attempt = 1; ; attempt++) {
        try {
          const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
          if (r.status === 404) { missing.push(path.basename(u)); break; }
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
          for (const line of execFileSync('unzip', ['-p', tmp], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n')) {
            const f = line.split(',');
            const t = Number(f[0]);
            if (!Number.isFinite(t) || f.length < 6) continue;
            out.push({ time: Math.floor(t > 1e14 ? t / 1e6 : t / 1e3), open: +f[1], high: +f[2], low: +f[3], close: +f[4], volume: +f[5] });
          }
          break;
        } catch (e) {
          if (attempt >= 3) throw new Error(`${u}: ${e.message}`);
          await new Promise(res => setTimeout(res, 2000 * attempt));
        }
      }
    }
    fs.rmSync(tmp, { force: true });
  }));
  const byT = new Map(out.map(b => [b.time, b]));
  return { bars: [...byT.values()].filter(b => b.time + DAY <= nowSec).sort((a, b) => a.time - b.time), missing };
}
function invalid(bars) { // data.mjs validate() for crypto (no split check)
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i], d = iso(Math.floor(b.time / DAY));
    if (!Number.isInteger(b.time) || !(b.close > 0)) return `bad bar ${d}`;
    for (const f of ['open', 'high', 'low']) if (!(Number.isFinite(b[f]) && b[f] > 0)) return `invalid ${f} ${d}`;
    if (!Number.isFinite(b.volume) || b.volume < 0) return `invalid volume ${d}`;
    if (b.low > Math.min(b.open, b.close) + 0.001 || b.high + 0.001 < Math.max(b.open, b.close)) return `OHLC inconsistent ${d}`;
    if (i && b.time <= bars[i - 1].time) return `non-increasing time ${d}`;
  }
  return null;
}

function git(...args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
function committed(f) { git('ls-files', '--error-unmatch', f); assert.equal(git('status', '--porcelain', '--', f), '', `${f} has uncommitted changes; commit it first`); }

async function preregister() {
  checkFrozen();
  const me = rel(import.meta.filename);
  committed(me); committed(PREREG);
  const log = fs.readFileSync(HOLDOUT_LOG, 'utf8');
  for (const c of CANDS) assert(!log.includes(tag(c.id)), `holdout log already carries "${tag(c.id)}"`);
  const runnerSha = sha(fs.readFileSync(import.meta.filename)), head = git('rev-parse', 'HEAD');
  for (const c of CANDS) {
    logHoldoutUse(`${tag(c.id)} — rule research/hunt2/strategies/${c.id}.mjs sha256=${c.sha}; control ${c.ctrl} sha256=${c.ctrlSha}; runner ${me} sha256=${runnerSha} @ ${head} (lane/hunt-0929); boundary ${new Date(DISCOVERY_END * 1000).toISOString()}; fetch data.binance.vision spot 1d 2025-02..latest complete bar; 18 CRYPTO_DAILY discovery-bucket pairs; k=${K}, one-sided Bonferroni alpha ${ALPHA}`, { logPath: HOLDOUT_LOG });
  }
  console.log(fs.readFileSync(HOLDOUT_LOG, 'utf8').split('\n').filter(l => l.includes('prereg-0929')).join('\n'));
}

async function run() {
  // one-shot guards, before anything else
  assert(!fs.existsSync(OUT), `${rel(OUT)} exists: the confirmatory test already ran`);
  const me = rel(import.meta.filename);
  committed(me); committed(PREREG);
  const runnerSha = sha(fs.readFileSync(import.meta.filename));
  const log = fs.readFileSync(HOLDOUT_LOG, 'utf8');
  for (const c of CANDS) {
    const line = log.split('\n').find(l => l.includes(tag(c.id)) && !l.includes('RESULT'));
    assert(line && line.includes(`sha256=${runnerSha}`), `no CONFIRMATORY line for ${c.id} naming this runner; run --preregister first`);
    assert(!log.includes(`${tag(c.id)} RESULT`), `${c.id} already has a RESULT line`);
  }
  const selfCheckResult = await selfCheck();

  const now = Date.now(), nowSec = Math.floor(now / 1000);
  const disc = {}, raw = {}, dropped = [], missing = {};
  for (const s of SYMBOLS) disc[s] = await loadBars(s, '1d');
  console.log('HOLDOUT FETCH (logged)', SYMBOLS.length, 'pairs');
  for (const s of SYMBOLS) {
    try { const v = await vision(s, nowSec); raw[s] = v.bars; missing[s] = v.missing; process.stdout.write(`\r${Object.keys(raw).length}/${SYMBOLS.length} ${s}   `); }
    catch (e) { dropped.push({ symbol: s, reason: `fetch failed: ${e.message}` }); }
  }
  console.log();
  const overlap = {};
  for (const s of SYMBOLS.filter(x => raw[x])) {
    const why = invalid(raw[s]);
    if (why) { dropped.push({ symbol: s, reason: `validation: ${why}` }); continue; }
    // vendor consistency on the discovery overlap (2025-02-01 .. 2025-03-14): any close off by > 0.1% drops the pair
    const cache = new Map(disc[s].filter(b => b.time >= Date.UTC(2025, 1, 1) / 1000).map(b => [b.time, b.close]));
    let maxRel = 0, matched = 0;
    for (const b of raw[s]) if (cache.has(b.time)) { matched++; maxRel = Math.max(maxRel, Math.abs(b.close / cache.get(b.time) - 1)); }
    overlap[s] = { cacheDays: cache.size, matched, maxRelCloseDiff: maxRel };
    if (matched < cache.size || maxRel > 0.001) dropped.push({ symbol: s, reason: `vendor overlap: ${matched}/${cache.size} days, max close diff ${maxRel}` });
  }
  let kept = SYMBOLS.filter(s => raw[s] && !dropped.some(d => d.symbol === s));
  const post = s => raw[s].filter(b => b.time >= DISCOVERY_END);
  const sessions = new Set(kept.flatMap(s => post(s).map(b => Math.floor(b.time / DAY))));
  for (const s of kept) if (post(s).length < 0.9 * sessions.size) dropped.push({ symbol: s, reason: `bars on ${post(s).length} of ${sessions.size} scored sessions (< 90%)` });
  kept = kept.filter(s => !dropped.some(d => d.symbol === s));
  assert(kept.includes('BTCUSDT'), 'BTCUSDT dropped: both rules need it; the exam cannot run');

  const dataBlob = zlib.gzipSync(JSON.stringify({ vendor: 'data.binance.vision spot 1d', fetchedAt: new Date(now).toISOString(), missingFiles: missing, bars: Object.fromEntries(Object.entries(raw).map(([s, b]) => [s, b.map(x => [x.time, x.open, x.high, x.low, x.close, x.volume])])) }));
  fs.writeFileSync(DATA_OUT, dataBlob);
  const result = {
    test: 'CONFIRMATORY prereg-0929', prereg: PREREG, status: 'scoring', k: K, alpha: ALPHA,
    runner: { file: me, sha256: runnerSha, commit: git('rev-parse', 'HEAD') }, harness: { sha256: FROZEN.harness, data: FROZEN.data, patchedCopySha256: patchedSha256 },
    selfCheck: selfCheckResult, boundary: new Date(DISCOVERY_END * 1000).toISOString(), ranAt: new Date(now).toISOString(),
    data: { vendor: 'data.binance.vision spot 1d klines', file: rel(DATA_OUT), sha256: sha(dataBlob), completedBarsOnly: `bar open + 1 day <= ${new Date(nowSec * 1000).toISOString()}`, preBoundary: 'discovery cache via loadBars() (identical to discovery inputs)', overlap },
    universe: { requested: SYMBOLS.length, kept: kept.length, dropped, names: kept },
  };
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n'); // drops recorded before any return is computed
  console.log(`pairs kept ${kept.length}, dropped ${dropped.length}:`, dropped.map(d => `${d.symbol} (${d.reason})`).join('; ') || 'none');

  const data = Object.fromEntries(kept.map(s => [s, [...disc[s], ...post(s)]]));
  result.candidates = [];
  for (const c of CANDS) {
    const S = await runOn(c.id, data), C = await runOn(c.ctrl, data);
    const k0 = S.days.findIndex(d => d * DAY >= DISCOVERY_END);
    assert(k0 > 0 && C.days[k0] === S.days[k0] && C.days.length === S.days.length, 'grid mismatch');
    const strat = summarize(S, k0), control = summarize(C, k0);
    let verdict;
    if (strat.days < 250 || strat.rebalances < 12) verdict = 'INCONCLUSIVE';
    else if (strat.excessAnnual > 0 && strat.p < ALPHA && strat.excessAnnual > control.excessAnnual) verdict = 'CONFIRMED';
    else if (strat.excessAnnual > 0 && strat.p >= ALPHA) verdict = 'NOT CONFIRMED: not confirmed, underpowered';
    else if (strat.excessAnnual > 0) verdict = 'NOT CONFIRMED: did not beat the dumb control';
    else verdict = 'NOT CONFIRMED';
    const row = { id: c.id, sourceSha256: c.sha, control: c.ctrl, controlSha256: c.ctrlSha, strategy: strat, dumbControl: { ...control, strategyBeatsControl: strat.excessAnnual > control.excessAnnual }, verdict,
      rule_text: `CONFIRMED iff excess/yr > 0 AND one-sided p < ${ALPHA} AND excess/yr above ${c.ctrl} on the same data and engine; INCONCLUSIVE if < 250 scored days or < 12 rebalances. A miss with excess > 0 and p >= alpha is "not confirmed, underpowered", never "falsified".` };
    result.candidates.push(row);
    fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
    logHoldoutUse(`${tag(c.id)} RESULT ${verdict}: excess/yr ${(strat.excessAnnual * 100).toFixed(2)}pp p=${strat.p.toFixed(4)} over ${strat.days} days ${strat.firstDay}..${strat.lastDay}, ${kept.length}/18 pairs; control excess/yr ${(control.excessAnnual * 100).toFixed(2)}pp; research/hunt2/holdout-exam-0929.json`, { logPath: HOLDOUT_LOG });
    console.log(JSON.stringify({ id: c.id, verdict, strategy: strat, control: { excessAnnual: control.excessAnnual, cagr: control.cagr, sharpe: control.sharpe, p: control.p } }, null, 2));
  }
  result.status = 'done';
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
}

if (process.argv.includes('--self-check')) { console.log(JSON.stringify(await selfCheck(), null, 2)); console.log('SELF-CHECK PASS'); }
else if (process.argv.includes('--preregister')) await preregister();
else if (process.argv.includes('--run')) await run();
else { console.error('pass --self-check, --preregister or --run'); process.exit(2); }
