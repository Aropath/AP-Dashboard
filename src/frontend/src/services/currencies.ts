export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  shortLabel: string;   // e.g. "INR (India)", "USD (U.S.)"
  symbolPosition: "before" | "after";
}

export const currencies: Record<string, CurrencyInfo> = {
  INR: { code: "INR", symbol: "₹",   name: "Indian Rupee",        shortLabel: "INR (India)",        symbolPosition: "before" },
  USD: { code: "USD", symbol: "$",   name: "US Dollar",            shortLabel: "USD (U.S.)",         symbolPosition: "before" },
  EUR: { code: "EUR", symbol: "€",   name: "Euro",                 shortLabel: "EUR (Europe)",       symbolPosition: "before" },
  GBP: { code: "GBP", symbol: "£",   name: "British Pound",        shortLabel: "GBP (UK)",           symbolPosition: "before" },
  AED: { code: "AED", symbol: "د.إ", name: "UAE Dirham",           shortLabel: "AED (UAE)",          symbolPosition: "after"  },
  SGD: { code: "SGD", symbol: "S$",  name: "Singapore Dollar",     shortLabel: "SGD (Singapore)",    symbolPosition: "before" },
  CAD: { code: "CAD", symbol: "C$",  name: "Canadian Dollar",      shortLabel: "CAD (Canada)",       symbolPosition: "before" },
  AUD: { code: "AUD", symbol: "A$",  name: "Australian Dollar",    shortLabel: "AUD (Australia)",    symbolPosition: "before" },
  JPY: { code: "JPY", symbol: "¥",   name: "Japanese Yen",         shortLabel: "JPY (Japan)",        symbolPosition: "before" },
  CHF: { code: "CHF", symbol: "₣",   name: "Swiss Franc",          shortLabel: "CHF (Switzerland)",  symbolPosition: "before" },
  HKD: { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar",     shortLabel: "HKD (Hong Kong)",    symbolPosition: "before" },
  NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar",   shortLabel: "NZD (New Zealand)",  symbolPosition: "before" },
  CNY: { code: "CNY", symbol: "¥",   name: "Chinese Yuan",         shortLabel: "CNY (China)",        symbolPosition: "before" },
  KRW: { code: "KRW", symbol: "₩",   name: "South Korean Won",     shortLabel: "KRW (South Korea)",  symbolPosition: "before" },
  MXN: { code: "MXN", symbol: "MX$", name: "Mexican Peso",         shortLabel: "MXN (Mexico)",       symbolPosition: "before" },
  BRL: { code: "BRL", symbol: "R$",  name: "Brazilian Real",       shortLabel: "BRL (Brazil)",       symbolPosition: "before" },
  ZAR: { code: "ZAR", symbol: "R",   name: "South African Rand",   shortLabel: "ZAR (South Africa)", symbolPosition: "before" },
  SAR: { code: "SAR", symbol: "﷼",   name: "Saudi Riyal",          shortLabel: "SAR (Saudi Arabia)", symbolPosition: "after"  },
  MYR: { code: "MYR", symbol: "RM",  name: "Malaysian Ringgit",    shortLabel: "MYR (Malaysia)",     symbolPosition: "before" },
  IDR: { code: "IDR", symbol: "Rp",  name: "Indonesian Rupiah",    shortLabel: "IDR (Indonesia)",    symbolPosition: "before" },
  THB: { code: "THB", symbol: "฿",   name: "Thai Baht",            shortLabel: "THB (Thailand)",     symbolPosition: "before" },
  PHP: { code: "PHP", symbol: "₱",   name: "Philippine Peso",      shortLabel: "PHP (Philippines)",  symbolPosition: "before" },
  SEK: { code: "SEK", symbol: "kr",  name: "Swedish Krona",        shortLabel: "SEK (Sweden)",       symbolPosition: "after"  },
  NOK: { code: "NOK", symbol: "kr",  name: "Norwegian Krone",      shortLabel: "NOK (Norway)",       symbolPosition: "after"  },
  DKK: { code: "DKK", symbol: "kr",  name: "Danish Krone",         shortLabel: "DKK (Denmark)",      symbolPosition: "after"  },
  PLN: { code: "PLN", symbol: "zł",  name: "Polish Zloty",         shortLabel: "PLN (Poland)",       symbolPosition: "after"  },
  CZK: { code: "CZK", symbol: "Kč",  name: "Czech Koruna",         shortLabel: "CZK (Czech Rep.)",   symbolPosition: "after"  },
  HUF: { code: "HUF", symbol: "Ft",  name: "Hungarian Forint",     shortLabel: "HUF (Hungary)",      symbolPosition: "after"  },
  TRY: { code: "TRY", symbol: "₺",   name: "Turkish Lira",         shortLabel: "TRY (Turkey)",       symbolPosition: "before" },
  ILS: { code: "ILS", symbol: "₪",   name: "Israeli Shekel",       shortLabel: "ILS (Israel)",       symbolPosition: "before" },
};

/** Ordered list of currency codes for dropdowns */
export const currencyList = Object.keys(currencies);

/** Get just the symbol for a currency code, falling back to the code itself */
export function getCurrencySymbol(code: string): string {
  return currencies[code]?.symbol ?? code;
}

/**
 * Format a numeric value with the correct currency symbol and position.
 * e.g. formatCurrency(1234.5, "INR") → "₹1,234.50"
 *      formatCurrency(1234.5, "SEK") → "1,234.50 kr"
 */
export function formatCurrency(value: number, code: string, decimals = 2): string {
  const info = currencies[code];
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (!info) return `${code} ${formatted}`;
  return info.symbolPosition === "before"
    ? `${info.symbol}${formatted}`
    : `${formatted} ${info.symbol}`;
}

/**
 * Compact formatter for chart tick labels (e.g. ₹1.2K, $450K).
 */
export function formatCurrencyCompact(value: number, code: string): string {
  const info = currencies[code];
  const sym = info?.symbol ?? code;
  const pos = info?.symbolPosition ?? "before";

  let compact: string;
  if (Math.abs(value) >= 1_000_000) {
    compact = `${(value / 1_000_000).toFixed(1)}M`;
  } else if (Math.abs(value) >= 1_000) {
    compact = `${(value / 1_000).toFixed(0)}K`;
  } else {
    compact = String(value);
  }

  return pos === "before" ? `${sym}${compact}` : `${compact} ${sym}`;
}
