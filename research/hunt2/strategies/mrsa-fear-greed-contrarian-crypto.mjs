// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "mrsa-fear-greed-contrarian-crypto",
  name: "Crypto Fear & Greed Index contrarian entries",
  family: "mean-reversion-statarb",
  source: "alternative.me Fear & Greed Index",
  assetClass: "crypto",
  timeframe: "1d",
  assets: ["BTCUSDT"],
  longShort: true,
  params: {
    fearThreshold: 20,
    greedThreshold: 80,
    consecutiveDays: 3,
    exitIndexLevel: 50,
    maxHoldDays: 30,
  },
};

export function signal(bars, i, ctx) {
  const fg = ctx.fearGreed();
  if (fg === null) return 0;

  const {fearThreshold, greedThreshold, consecutiveDays, exitIndexLevel, maxHoldDays} = ctx.params;

  // Initialize state
  if (!ctx.state.positions) {
    ctx.state.positions = {};
  }
  if (!ctx.state.fgHistory) {
    ctx.state.fgHistory = [];
  }

  const key = 'BTCUSDT';
  const pos = ctx.state.positions[key] || {inTrade: false, direction: 0, entryBar: -1};

  // Check exit conditions for existing position
  if (pos.inTrade && pos.direction !== 0) {
    const holdDuration = i - pos.entryBar;
    if (fg > exitIndexLevel || holdDuration >= maxHoldDays) {
      pos.inTrade = false;
      pos.direction = 0;
      ctx.state.positions[key] = pos;
      return 0;
    }
  }

  // If we're in a trade, hold it
  if (pos.inTrade) {
    ctx.state.positions[key] = pos;
    return pos.direction;
  }

  // Track fear & greed history
  ctx.state.fgHistory.push(fg);

  // Need at least consecutiveDays of history
  if (ctx.state.fgHistory.length < consecutiveDays) {
    ctx.state.positions[key] = pos;
    return 0;
  }

  // Check last N days for extreme fear (< fearThreshold)
  let extremeFearCount = 0;
  const startIdx = Math.max(0, ctx.state.fgHistory.length - consecutiveDays);
  for (let k = startIdx; k < ctx.state.fgHistory.length; k++) {
    if (ctx.state.fgHistory[k] < fearThreshold) {
      extremeFearCount++;
    }
  }

  // Check last N days for extreme greed (> greedThreshold)
  let extremeGreedCount = 0;
  for (let k = startIdx; k < ctx.state.fgHistory.length; k++) {
    if (ctx.state.fgHistory[k] > greedThreshold) {
      extremeGreedCount++;
    }
  }

  // Entry logic
  if (extremeFearCount === consecutiveDays) {
    // Enter long on 3 consecutive days of extreme fear
    pos.inTrade = true;
    pos.direction = 1;
    pos.entryBar = i;
    ctx.state.positions[key] = pos;
    return 1;
  }

  if (extremeGreedCount === consecutiveDays) {
    // Short on 3 consecutive days of extreme greed
    pos.inTrade = true;
    pos.direction = -1;
    pos.entryBar = i;
    ctx.state.positions[key] = pos;
    return -1;
  }

  ctx.state.positions[key] = pos;
  return 0;
}
