export const meta = {
  id: "volreg-ma200-vixhigh",
  name: "200dma exit taken ONLY in a high-VIX regime (VIX >= trailing 504d median)",
  family: "volatility",
  source: "hunt lane sonnet-2 2026-09-22: regime-conditioned variant. Mechanism claim: the 200dma rule is a laggy volatility-regime detector, so its exits are informative only when implied vol is already elevated; calm-market crossovers are whipsaw. Base = volreg-ma200-base.",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "DIA", "XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLC", "VNQ"],
  params: { maWindow: 200, vixWindow: 504, warmup: 504 },
};

// Trailing median of VIX over the last `vixWindow` known daily closes.
// Built by pushing one value per bar (no running sums, so no NaN poisoning);
// verified against an independent numpy median on the last discovery date.
function vixRegimeHigh(ctx) {
  if (ctx.state.vixHist === undefined) ctx.state.vixHist = [];
  const h = ctx.state.vixHist;
  const v = ctx.macro("VIX");
  let high = null;
  if (h.length >= ctx.params.vixWindow && v !== null && Number.isFinite(v)) {
    const w = h.slice(h.length - ctx.params.vixWindow).sort((a, b) => a - b);
    const mid = w.length % 2 === 1
      ? w[(w.length - 1) / 2]
      : (w[w.length / 2 - 1] + w[w.length / 2]) / 2;
    high = v >= mid;
  }
  if (v !== null && Number.isFinite(v)) h.push(v);
  return high;   // null until the window is full
}

export function signal(bars, i, ctx) {
  const high = vixRegimeHigh(ctx);              // called every bar so the buffer stays aligned
  if (i < ctx.params.warmup) return 1;
  const ma = ctx.sma("close", ctx.params.maWindow, i);
  if (!Number.isFinite(ma)) return 1;
  if (high === null) return bars[i].close > ma ? 1 : 0;   // gate unknown -> ungated base
  return high === false ? 1 : (bars[i].close > ma ? 1 : 0);
}
