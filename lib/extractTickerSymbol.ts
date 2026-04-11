/**
 * Pick a display ticker for financial reels from FMP-style article text.
 * Prefers explicit "ticker: XYZ" / exchange-prefixed lines; avoids venue names (NYSE, NASDAQ, …).
 */

const NOT_TICKERS = new Set([
  // Venues / instruments (not a single stock)
  "NYSE",
  "NASDAQ",
  "NASDAQGS",
  "NYSEARCA",
  "AMEX",
  "ARCA",
  "LSE",
  "OTC",
  "OTCMKTS",
  "TSX",
  "TSXV",
  "HKEX",
  "SSE",
  "SZSE",
  "CBOE",
  "ICE",
  "ETF",
  "ETFS",
  "IPO",
  "SPAC",
  "REIT",
  "ADRS",
  "DOW",
  "SPX",
  "VIX",
  // Macro / fiat
  "USD",
  "CNY",
  "EUR",
  "GBP",
  "JPY",
  // Agencies / macro acronyms
  "USA",
  "UAW",
  "SEC",
  "IRS",
  "FDA",
  "BLS",
  "FED",
  "ECB",
  "BOE",
  "BOJ",
  "EU",
  "UN",
  "UK",
  "GDP",
  "CPI",
  "PPI",
  "EPS",
  "YTD",
  "EOD",
  "QTR",
  "CEO",
  "CFO",
  "CTO",
  // Common headline ALL-CAPS noise
  "THE",
  "AND",
  "FOR",
  "BUT",
  "NOT",
  "YOU",
  "ALL",
  "CAN",
  "OUR",
  "OUT",
  "NOW",
  "NEW",
  "WHO",
  "HOW",
  "ITS",
  "MAY",
  "WAY",
  "DAY",
  "MAN",
  "ONE",
  "TWO",
  "HER",
  "HIM",
  "STOCK",
  "STOCKS",
  "SHARE",
  "NEWS",
  "DEAL",
  "DEALS",
  "BANK",
  "RATE",
  "RATES",
  "WALL",
  "SAY",
  "SAYS",
  "YEAR",
  "LAST",
  "NEXT",
  "WEEK",
  "TIME",
  "LONG",
  "HIGH",
  "LOW",
  "BIG",
  "TOP",
  "MORE",
  "BACK",
  "OVER",
  "JUST",
  "SURE",
  "FROM",
  "WITH",
  "THAN",
  "THIS",
  "THAT",
  "WHAT",
  "WHEN",
  "YOUR",
  "WILL",
  "HAVE",
  "BEEN",
  "THEY",
  "SOME",
  "INTO",
  "ONLY",
  "ALSO",
  "VERY",
  "EVEN",
  "MADE",
  "MAKE",
  "MANY",
  "MUCH",
  "SUCH",
  "COME",
  "CAME",
  "THERE",
  "THEIR",
  "THESE",
  "THOSE",
  "WHERE",
  "WHILE",
  "AFTER",
  "BEFORE",
  "UNDER",
  "ABOVE",
  "BELOW",
  "SINCE",
  "UNTIL",
  "AMID",
  "NEAR",
  "DOWN",
  "FREE",
  "FULL",
  "HALF",
  "PART",
  "CASE",
  "CARE",
  "COST",
  "CASH",
  "DEBT",
  "LOSS",
  "GAIN",
  "RISE",
  "FALL",
  "DROP",
  "HITS",
  "HIT",
  "TODAY",
  "MONTH",
  "EARLY",
  "LATE",
  "GOOD",
  "BAD",
  "REAL",
  "TRUE",
  "SEES",
  "SEEN",
  "GAVE",
  "GONE",
  "FLAT",
  "HALTS",
  "SOARS",
  "JUMPS",
  "RALLY",
  "SELLS",
  "BUYS",
  "FILES",
  "POSTS",
  "GAINS",
  "FALLS",
  "RISES",
  "CRASH",
  "SINKS",
  "SLUMP",
  "WARNS",
  "PLANS",
  "OPENS",
  "CLOSE",
  "CLOSES",
]);

const TWO_LETTER_SKIP = new Set([
  "IT",
  "IS",
  "IN",
  "ON",
  "AT",
  "TO",
  "OF",
  "OR",
  "BE",
  "AS",
  "BY",
  "WE",
  "IF",
  "SO",
  "NO",
  "GO",
  "UP",
  "US",
  "DO",
  "MY",
  "ME",
  "HE",
  "AM",
  "AN",
  "ID",
  "OK",
]);

function normalizeSym(raw: string): string {
  return raw.toUpperCase();
}

function okExplicit(sym: string): boolean {
  const u = normalizeSym(sym);
  if (!/^[A-Z]+$/.test(u) || u.length < 1 || u.length > 5) return false;
  return !NOT_TICKERS.has(u);
}

function okTitleWord(sym: string): boolean {
  const u = normalizeSym(sym);
  if (!/^[A-Z]+$/.test(u) || u.length < 2 || u.length > 5) return false;
  if (NOT_TICKERS.has(u)) return false;
  if (u.length === 2 && TWO_LETTER_SKIP.has(u)) return false;
  return true;
}

/** High-confidence patterns: label or exchange then real symbol. */
const EXPLICIT_PATTERNS: RegExp[] = [
  /\btickers?\s*:\s*([A-Za-z]{1,5})\b/gi,
  /\bsymbol\s*:\s*([A-Za-z]{1,5})\b/gi,
  /\bstock\s*symbol\s*:\s*([A-Za-z]{1,5})\b/gi,
  /\b(?:NYSE|NASDAQ|NASDAQGS|AMEX|NYSEARCA)\s*:\s*([A-Za-z]{1,5})\b/gi,
  /\(\s*(?:NYSE|NASDAQ|NASDAQGS|AMEX)\s*:\s*([A-Za-z]{1,5})\s*\)/gi,
  /\$\s*([A-Za-z]{1,5})\b/g,
];

function firstExplicit(full: string): string | undefined {
  for (const re of EXPLICIT_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(full)) !== null) {
      if (okExplicit(m[1])) return normalizeSym(m[1]);
    }
  }
  return undefined;
}

function firstTitleFallback(title: string): string | undefined {
  const re = /\b([A-Z]{2,5})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(title)) !== null) {
    if (okTitleWord(m[1])) return normalizeSym(m[1]);
  }
  return undefined;
}

/**
 * @param apiHint Optional symbol from the news API — used only if it passes the same
 *   filters as explicit text (never prefer raw NYSE/NASDAQ venue codes).
 */
export function extractTickerFromNews(
  article: { title: string; content: string },
  apiHint?: string | null
): string | undefined {
  const full = `${article.title}\n${article.content}`;
  const fromLabel = firstExplicit(full);
  if (fromLabel) return fromLabel;
  const fromTitle = firstTitleFallback(article.title);
  if (fromTitle) return fromTitle;
  if (apiHint != null && apiHint.trim() !== "") {
    for (const part of apiHint.split(/[,\s;]+/)) {
      const t = part.trim();
      if (t && okExplicit(t)) return normalizeSym(t);
    }
  }
  return undefined;
}
