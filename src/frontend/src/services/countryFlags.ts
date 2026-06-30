export const countryCodes: Record<string, string> = {
  "United States": "US",
  "USA": "US",
  "US": "US",
  "India": "IN",
  "IN": "IN",
  "United Kingdom": "GB",
  "UK": "GB",
  "GB": "GB",
  "Canada": "CA",
  "CA": "CA",
  "Germany": "DE",
  "DE": "DE",
  "France": "FR",
  "FR": "FR",
  "Australia": "AU",
  "AU": "AU",
  "Singapore": "SG",
  "SG": "SG",
  "Netherlands": "NL",
  "NL": "NL",
  "Japan": "JP",
  "JP": "JP",
  "Ireland": "IE",
  "IE": "IE",
  "Brazil": "BR",
  "BR": "BR",
};

export function getCountryCode(country?: string | null): string | null {
  if (!country) return null;

  const normalized = String(country).trim();
  if (!normalized) return null;

  const directMatch = countryCodes[normalized];
  if (directMatch) return directMatch;

  const fallbackMatch = Object.entries(countryCodes).find(
    ([key]) => key.toLowerCase() === normalized.toLowerCase(),
  );
  if (fallbackMatch) return fallbackMatch[1];

  const upperMatch = countryCodes[normalized.toUpperCase()];
  if (upperMatch) return upperMatch;

  return null;
}

export function getCountryNameFromTimezone(timezoneLabel?: string | null): string {
  if (!timezoneLabel) return "India";

  const normalized = timezoneLabel.toLowerCase();
  const timezoneCountryMap: Record<string, string> = {
    "utc": "United States",
    "america/new_york": "United States",
    "america/chicago": "United States",
    "america/denver": "United States",
    "america/los_angeles": "United States",
    "europe/london": "United Kingdom",
    "europe/paris": "France",
    "europe/berlin": "Germany",
    "asia/tokyo": "Japan",
    "australia/sydney": "Australia",
    "asia/kolkata": "India",
  };

  const match = Object.entries(timezoneCountryMap).find(([key]) => normalized.includes(key));
  return match?.[1] ?? "India";
}
