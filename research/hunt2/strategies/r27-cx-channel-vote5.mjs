// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "r27-cx-channel-vote5",
  name: "Crypto five-lookback channel-position vote",
  family: "trend",
  source: "Zarattini, Pagani & Barbon 2025 SSRN 'Catching Crypto Trends: A Tactical Approach for Bitcoin and Altcoins' (Donchian-channel ensemble over many lookbacks); Hurst, Ooi & Pedersen 2017 JPM (multi-horizon trend blends)",
  assetClass: "crypto",
  timeframe: "1d",
  params: { lookbacks: [10, 20, 40, 80, 160], votesNeeded: 3 },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat.
// ctx.params is meta.params. ctx.donchian(n, i) = { upper, lower } over bars i-n+1..i (bar i included).
export function signal(bars, i, ctx) {
  const { lookbacks, votesNeeded } = ctx.params;
  const close = bars[i].close;

  let votes = 0;
  for (const n of lookbacks) {
    if (i < n) {
      votes += 1; // not enough history for this lookback: warm-up, count as a long vote
      continue;
    }
    const { upper, lower } = ctx.donchian(n, i - 1);
    if (close > (upper + lower) / 2) votes += 1;
  }

  return votes >= votesNeeded ? 1 : 0;
}
