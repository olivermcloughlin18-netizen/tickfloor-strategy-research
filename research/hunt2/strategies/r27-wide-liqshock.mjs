// prereg C6: liquidity-shock reversal on wide US stocks. Amihud illiquidity improves fastest
// (shock = (Y - A) / Y, Y = trailing-year illiq, A = trailing-month illiq) predicts underreaction
// to positive liquidity shocks -> go long the names whose liquidity improved most.
export const meta = {
  id: "r27-wide-liqshock",
  name: "Positive liquidity shocks (wide US stocks)",
  family: "equity-factors",
  source: "Bali, Peng, Shen & Tang 2014 RFS 'Liquidity shocks and stock market reactions' (positive liquidity shocks predict higher returns: underreaction); u/Potential_Web_4092, r/ASX_Bets 1wo5lrs (average daily volume should drive sizing)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lag: 2, short: 21, long: 252, need: 254 },
};

function equalWeights(universe) {
  const symbols = Object.keys(universe);
  const weights = {};
  for (const symbol of symbols) weights[symbol] = 1 / symbols.length;
  return weights;
}

// mean over sessions k in [from, to] with volume > 0 of |r(k)| / (close(k) * volume(k))
function illiq(b, from, to) {
  let sum = 0;
  let count = 0;
  for (let k = from; k <= to; k++) {
    const prior = b[k - 1].close;
    const close = b[k].close;
    const volume = b[k].volume;
    if (!Number.isFinite(prior) || !Number.isFinite(close) || !Number.isFinite(volume) || prior <= 0 || close <= 0 || volume <= 0) continue;
    const r = close / prior - 1;
    const value = Math.abs(r) / (close * volume);
    if (Number.isFinite(value)) { sum += value; count++; }
  }
  return count > 0 ? sum / count : NaN;
}

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const candidates = [];
  let M = 0;
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    const L = b.length;
    if (L < p.need) continue;
    const e = L - p.lag;
    const A = illiq(b, e - (p.short - 1), e);
    const Y = illiq(b, e - (p.long - 1), e);
    if (!Number.isFinite(A) || !Number.isFinite(Y) || Y === 0) continue;
    const shock = (Y - A) / Y;
    if (!Number.isFinite(shock)) continue;
    M++;
    candidates.push([sym, shock]);
  }
  if (M < 50) return equalWeights(universe);
  const N = Math.max(10, Math.round(0.2 * M));
  candidates.sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
  const held = candidates.slice(0, N);
  const weights = {};
  for (const [sym] of held) weights[sym] = 1 / held.length;
  return weights;
}
