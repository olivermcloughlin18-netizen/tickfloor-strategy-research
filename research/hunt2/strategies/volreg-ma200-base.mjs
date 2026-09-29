export const meta = {
  id: "volreg-ma200-base",
  name: "200dma trend exit on equity-sector ETFs (ungated base)",
  family: "volatility",
  source: "hunt lane sonnet-2 2026-09-22: ungated base for the VIX-regime-conditioned 200dma exit. Base rule = Faber/absolute-momentum 200dma (trend-managed-futures family, already failed overall).",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "DIA", "XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLC", "VNQ"],
  params: { maWindow: 200, vixWindow: 504, warmup: 504 },
};

export function signal(bars, i, ctx) {
  if (i < ctx.params.warmup) return 1;          // warm-up: hold long, same as every variant
  const ma = ctx.sma("close", ctx.params.maWindow, i);
  if (!Number.isFinite(ma)) return 1;
  return bars[i].close > ma ? 1 : 0;
}
