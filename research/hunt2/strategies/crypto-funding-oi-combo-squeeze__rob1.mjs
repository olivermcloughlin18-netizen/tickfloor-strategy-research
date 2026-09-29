// Funding + OI combined squeeze detector.
// Long when funding rate is in the bottom 5th percentile of its trailing 90-day
// window (crowded shorts) AND open interest is at a 30-day high (crowded
// positioning), simultaneously. Exit when funding rises back above the trailing
// median, or after 5 days, whichever first.

export const meta = {
  id: "crypto-funding-oi-combo-squeeze__rob1",
  name: "Funding + OI combined squeeze detector",
  family: "carry",
  source: "Coinglass/Velo Data squeeze commentary; builds on funding-bounce §10 with an added OI filter",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  params: {
    fundWindow: 1620,   // rob1: -25% (67.5d)
    oiWindow: 540,       // rob1: -25% (22.5d)
    pctThreshold: 4,     // rob1: -20%
    maxHoldBars: 90,    // rob1: -25% (3.75d)
  },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  const st = ctx.state;
  if (st.fundBuf === undefined) {
    st.fundBuf = [];      // trailing funding rate samples
    st.oiBuf = [];        // trailing OI samples
    st.pos = 0;
    st.entryBar = -1;
  }

  const funding = ctx.fundingRate();
  const oi = ctx.openInterest();

  // maintain trailing windows (push current known values every bar)
  if (funding !== null) {
    st.fundBuf.push(funding);
    if (st.fundBuf.length > p.fundWindow) st.fundBuf.shift();
  }
  if (oi !== null) {
    st.oiBuf.push(oi);
    if (st.oiBuf.length > p.oiWindow) st.oiBuf.shift();
  }

  // manage an open position first: exit conditions
  if (st.pos === 1) {
    const heldBars = i - st.entryBar;
    let exit = heldBars >= p.maxHoldBars;
    if (!exit && funding !== null && st.fundBuf.length >= 10) {
      const sorted = [...st.fundBuf].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      if (funding > median) exit = true;
    }
    if (exit) {
      st.pos = 0;
      return 0;
    }
    return 1;
  }

  // need full windows and current known values to evaluate entry
  if (funding === null || oi === null) return 0;
  if (st.fundBuf.length < p.fundWindow || st.oiBuf.length < p.oiWindow) return 0;

  const sortedFund = [...st.fundBuf].sort((a, b) => a - b);
  const rank = sortedFund.filter((v) => v <= funding).length / sortedFund.length; // 0..1
  const fundingLow = rank * 100 <= p.pctThreshold;

  const oiHigh = oi >= Math.max(...st.oiBuf);

  if (fundingLow && oiHigh) {
    st.pos = 1;
    st.entryBar = i;
    return 1;
  }
  return 0;
}
