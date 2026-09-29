export const meta = {
  id: "s29-etf-dynamic-hedge-selection__rob1",
  name: "QQQ plus whichever defensive asset is least correlated with it (-25%)",
  family: "other",
  source: "Ilmanen 2003 JFI; Campbell, Sunderam & Viceira 2017 Critical Finance Review (inflation bets or deflation hedges: time-varying hedges)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "TLT", "IEF", "SHY", "AGG", "LQD", "GLD", "UUP"],
  rebalance: "monthly",
  longShort: false,
  params: { window: 47, core: 0.6 },
};

const HEDGES = ["TLT", "IEF", "SHY", "AGG", "LQD", "GLD", "UUP"];

function correlation(a, b, window) {
  let i = a.length - 1;
  let j = b.length - 1;
  const pairs = [];

  while (i > 0 && j > 0 && pairs.length < window) {
    if (a[i].time === b[j].time) {
      pairs.push([
        a[i].close / a[i - 1].close - 1,
        b[j].close / b[j - 1].close - 1,
      ]);
      i--;
      j--;
    } else if (a[i].time > b[j].time) {
      i--;
    } else {
      j--;
    }
  }

  if (pairs.length < window) return NaN;

  let meanA = 0;
  let meanB = 0;
  for (const pair of pairs) {
    meanA += pair[0];
    meanB += pair[1];
  }
  meanA /= window;
  meanB /= window;

  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (const pair of pairs) {
    const da = pair[0] - meanA;
    const db = pair[1] - meanB;
    covariance += da * db;
    varianceA += da * da;
    varianceB += db * db;
  }

  const scale = Math.sqrt(varianceA * varianceB);
  return scale > 0 ? covariance / scale : NaN;
}

export function rank(universe, t, ctx) {
  const qqq = universe.QQQ;
  if (!qqq) return {};

  let selected = null;
  let lowest = Infinity;
  for (const symbol of HEDGES) {
    const bars = universe[symbol];
    if (!bars) continue;
    const rho = correlation(qqq, bars, ctx.params.window);
    if (Number.isFinite(rho) && rho < lowest) {
      lowest = rho;
      selected = symbol;
    }
  }

  if (!selected) return {};
  return { QQQ: ctx.params.core, [selected]: 1 - ctx.params.core };
}
