// node --import tsx research/hunt2/run.mjs research/hunt2/strategies/<id>.mjs
import { runStrategy } from "./harness.mjs";

if (process.argv.length !== 3) {
  console.error("usage: node --import tsx research/hunt2/run.mjs research/hunt2/strategies/<id>.mjs");
  process.exit(2);
}
try {
  const r = await runStrategy(process.argv[2]);
  const p = (x) => `${(x * 100).toFixed(2)}%`;
  const pp = (x) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(2)}pp`;
  console.log(`${r.id} (${r.mode}, ${r.nAssets} assets, ${r.period.start}..${r.period.end})${r.substitutions.length ? ` proxies: ${r.substitutions.map((s) => `${s.proxy} for ${s.holdout}`).join(", ")}` : ""}`);
  console.log(`CAGR ${p(r.portfolio.cagr)} vs buy&hold ${p(r.benchmark.cagr)} | Sharpe ${r.portfolio.sharpe.toFixed(2)} vs ${r.benchmark.sharpe.toFixed(2)} (p=${r.sharpeTest.p.toExponential(2)}) | maxDD ${p(r.portfolio.maxDD)} vs ${p(r.benchmark.maxDD)}`);
  console.log(`excess ${pp(r.excess.annual)}/yr p=${r.excess.p.toExponential(2)} | beats ${p(r.randomControl.percentile)} of ${r.randomControl.seeds} random controls (Sharpe: ${p(r.randomControl.sharpePercentile)}) | trades ${r.portfolio.trades} rebalances ${r.portfolio.rebalances} exposure ${p(r.portfolio.exposure)} | halves ${r.halfExcess.map(pp).join(" / ")}`);
  for (const w of r.warnings) console.log(`WARNING ${w}`);
  console.log(`RESULT_JSON ${r.resultPath}`);
} catch (e) {
  console.error(`REJECTED: ${e.message}`);
  process.exit(1);
}
