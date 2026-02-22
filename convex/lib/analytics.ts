/**
 * Phone prefix → ISO country code mapping.
 * Reuses the same prefixes as COUNTRY_CODE_TIMEZONES in utils.ts.
 */
const PHONE_PREFIX_TO_COUNTRY: Record<string, string> = {
  "+971": "AE",
  "+966": "SA",
  "+973": "BH",
  "+974": "QA",
  "+968": "OM",
  "+965": "KW",
  "+44": "GB",
  "+1": "US",
  "+33": "FR",
  "+49": "DE",
  "+61": "AU",
  "+81": "JP",
  "+86": "CN",
  "+91": "IN",
  "+92": "PK",
  "+20": "EG",
  "+27": "ZA",
  "+55": "BR",
  "+7": "RU",
  "+82": "KR",
  "+90": "TR",
  "+234": "NG",
  "+880": "BD",
  "+62": "ID",
  "+263": "ZW",
};

const SORTED_COUNTRY_PREFIXES = Object.keys(PHONE_PREFIX_TO_COUNTRY).sort(
  (a, b) => b.length - a.length
);

/**
 * Derive ISO country code from phone number prefix.
 * Returns "XX" if no match found.
 */
export function detectCountryFromPhone(phone: string): string {
  for (const prefix of SORTED_COUNTRY_PREFIXES) {
    if (phone.startsWith(prefix)) {
      return PHONE_PREFIX_TO_COUNTRY[prefix];
    }
  }
  return "XX";
}
