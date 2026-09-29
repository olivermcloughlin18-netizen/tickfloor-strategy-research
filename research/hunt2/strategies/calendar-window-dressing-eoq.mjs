// End-of-quarter window dressing: long worst prior-quarter sector ETF
// for the last 3 trading days of the quarter and first 3 of next

export const meta = {
  id: "calendar-window-dressing-eoq",
  name: "End-of-quarter window dressing bounce",
  family: "calendar",
  source: "Lakonishok, Shleifer, Thaler, Vishny 1991 J. Finance ('window dressing')",
  assetClass: "etf",
  timeframe: "1d",
  universe: "ETFS_DAILY",
  rebalance: "daily",
  params: {},
};

function dateFromTime(time) {
  // time is a string like "2024-01-15" or a number (unix timestamp in seconds)
  if (typeof time === 'number') {
    // Unix timestamp in seconds, convert to milliseconds
    return new Date(time * 1000);
  }
  return new Date(time);
}

function getQuarter(date) {
  return Math.floor(date.getMonth() / 3);
}

function getQuarterMonths(quarter) {
  const start = quarter * 3;
  return [start, start + 1, start + 2];
}

function getQuarterFromMonthDay(month, day) {
  return Math.floor(month / 3);
}

function isInWindow(sectorBars, i) {
  if (i < 3) return false;

  const current = sectorBars[i];
  const currentDate = dateFromTime(current.time);
  const month = currentDate.getMonth();
  const day = currentDate.getDate();

  // Last 3 trading days of each quarter: check if we're near quarter end
  // Q1 ends Mar 31, Q2 ends Jun 30, Q3 ends Sep 30, Q4 ends Dec 31
  const nearQEnd = (month === 2 && day >= 28) ||   // Late March
                   (month === 5 && day >= 28) ||   // Late June
                   (month === 8 && day >= 28) ||   // Late September
                   (month === 11 && day >= 28);    // Late December

  // First 3 trading days of each quarter
  const nearQStart = (month === 0 && day <= 3) ||  // Early January
                     (month === 3 && day <= 3) ||  // Early April
                     (month === 6 && day <= 3) ||  // Early July
                     (month === 9 && day <= 3);    // Early October

  return nearQEnd || nearQStart;
}

export function rank(universe, t, ctx) {
  const sectorETFs = new Set(["XLK", "XLV", "XLE", "XLF", "XLI", "XLY", "XLP", "XLRE", "XLU", "XLC", "XLB"]);
  const universeKeys = Object.keys(universe).filter(sym => sectorETFs.has(sym));

  if (universeKeys.length === 0) return {};

  // Use any sector's bars to check if we're in a window
  let inWindow = false;
  let exampleBars = null;
  for (const sym of universeKeys) {
    if (universe[sym] && universe[sym].length > 0) {
      exampleBars = universe[sym];
      const lastIdx = exampleBars.length - 1;
      inWindow = isInWindow(exampleBars, lastIdx);
      break;
    }
  }

  if (!inWindow) {
    return {};
  }

  const currentDate = dateFromTime(exampleBars[exampleBars.length - 1].time);
  const currentQtr = getQuarter(currentDate);
  let priorQtr = currentQtr - 1;
  let priorYear = currentDate.getFullYear();
  if (priorQtr < 0) {
    priorQtr = 3;
    priorYear -= 1;
  }

  const priorMonths = getQuarterMonths(priorQtr);

  // Calculate returns during prior quarter for each sector
  const scores = [];
  for (const sym of universeKeys) {
    const bars = universe[sym];
    if (!bars || bars.length < 2) continue;

    // Find first and last bar in prior quarter
    let qStartIdx = -1;
    let qEndIdx = -1;

    for (let i = 0; i < bars.length; i++) {
      const barDate = dateFromTime(bars[i].time);
      const isInPriorQtr = barDate.getFullYear() === priorYear &&
                           priorMonths.includes(barDate.getMonth());

      if (isInPriorQtr) {
        if (qStartIdx === -1) qStartIdx = i;
        qEndIdx = i;
      }
    }

    if (qStartIdx === -1 || qEndIdx === -1) continue;

    const startPrice = bars[qStartIdx].close;
    const endPrice = bars[qEndIdx].close;
    const ret = (endPrice - startPrice) / startPrice;

    scores.push([sym, ret]);
  }

  if (scores.length === 0) return {};

  // Sort by return (ascending) - worst performer first
  scores.sort((a, b) => a[1] - b[1]);

  // Long the worst performer from prior quarter
  const worstSector = scores[0][0];
  return { [worstSector]: 1 };
}
