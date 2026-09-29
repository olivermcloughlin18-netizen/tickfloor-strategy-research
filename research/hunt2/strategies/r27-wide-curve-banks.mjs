// prereg C7 r27: yield-curve steepening rotates into bank stocks (wide US universe).
// Bank equities are sensitive to net-interest-margin expectations, which move with curve
// slope: a steepening 10y-2y spread favors banks, a flattening/inverting one hurts them.
export const meta = {
  id: "r27-wide-curve-banks",
  name: "Bank stocks when the yield curve steepens (wide US stocks)",
  family: "macro",
  source: "English, Van den Heuvel & Zakrajšek 2018 JME 'Interest rate risk and bank equity valuations' (bank stocks fall when the curve flattens); Flannery & James 1984 JF",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lagMonths: 3 },
};

const BANKS = ["JPM", "BAC", "WFC", "C", "STT", "RF", "ZION", "WAL", "UMBF"];

function ew(universe) {
  const syms = Object.keys(universe).sort();
  const w = {};
  for (const s of syms) w[s] = 1 / syms.length;
  return w;
}

export function rank(universe, t, ctx) {
  if (ctx.state.S === undefined) ctx.state.S = [];
  const S = ctx.state.S;
  S.push(ctx.macro("T10Y2Y"));

  const last = S.length - 1;
  if (S.length < 4 || S[last] === null || S[last - 3] === null) return ew(universe);

  const steep = S[last] - S[last - 3] > 0;
  if (!steep) return ew(universe);

  const present = BANKS.filter((s) => universe[s]).sort();
  if (present.length === 0) return ew(universe);
  const w = {};
  for (const s of present) w[s] = 1 / present.length;
  return w;
}
