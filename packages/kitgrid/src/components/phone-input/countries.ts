export interface PhoneInputCountry {
  /** ISO 3166-1 alpha-2. */
  code: string
  name: string
  /** Calling code without the plus. */
  dial: string
  /** National number layout, `#` per digit. */
  pattern: string
}

/* A compact default list; pass `countries` for others. Layouts follow common national style. */
export const phoneInputCountries: readonly PhoneInputCountry[] = [
  { code: "US", name: "United States", dial: "1", pattern: "(###) ###-####" },
  { code: "CA", name: "Canada", dial: "1", pattern: "(###) ###-####" },
  { code: "GB", name: "United Kingdom", dial: "44", pattern: "#### ######" },
  { code: "IE", name: "Ireland", dial: "353", pattern: "## ### ####" },
  { code: "DE", name: "Germany", dial: "49", pattern: "#### #######" },
  { code: "FR", name: "France", dial: "33", pattern: "# ## ## ## ##" },
  { code: "ES", name: "Spain", dial: "34", pattern: "### ## ## ##" },
  { code: "PT", name: "Portugal", dial: "351", pattern: "### ### ###" },
  { code: "IT", name: "Italy", dial: "39", pattern: "### ### ####" },
  { code: "NL", name: "Netherlands", dial: "31", pattern: "# ########" },
  { code: "CH", name: "Switzerland", dial: "41", pattern: "## ### ## ##" },
  { code: "SE", name: "Sweden", dial: "46", pattern: "##-### ## ##" },
  { code: "PL", name: "Poland", dial: "48", pattern: "### ### ###" },
  { code: "IN", name: "India", dial: "91", pattern: "##### #####" },
  { code: "JP", name: "Japan", dial: "81", pattern: "##-####-####" },
  { code: "KR", name: "South Korea", dial: "82", pattern: "##-####-####" },
  { code: "CN", name: "China", dial: "86", pattern: "### #### ####" },
  { code: "SG", name: "Singapore", dial: "65", pattern: "#### ####" },
  { code: "AU", name: "Australia", dial: "61", pattern: "### ### ###" },
  { code: "NZ", name: "New Zealand", dial: "64", pattern: "## ### ####" },
  { code: "AE", name: "United Arab Emirates", dial: "971", pattern: "## ### ####" },
  { code: "ZA", name: "South Africa", dial: "27", pattern: "## ### ####" },
  { code: "NG", name: "Nigeria", dial: "234", pattern: "### ### ####" },
  { code: "BR", name: "Brazil", dial: "55", pattern: "(##) #####-####" },
  { code: "MX", name: "Mexico", dial: "52", pattern: "## #### ####" },
]

/** Lays digits into the pattern, dropping trailing literals so deleting stays natural. */
export const formatPhone = (digits: string, pattern: string): string => {
  let out = ""
  let index = 0
  for (const char of pattern) {
    if (index >= digits.length) break
    if (char === "#") out += digits[index++]
    else out += char
  }
  return out + digits.slice(index)
}

export const maxDigits = (pattern: string): number => pattern.split("#").length - 1
