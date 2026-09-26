import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
];

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/**
 * Catches common domain typos (gmial.com -> gmail.com) without flagging
 * unfamiliar-but-valid domains. Returns the corrected email, or null if
 * there's nothing worth suggesting.
 */
export function suggestEmailCorrection(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;

  const domain = email.slice(at + 1).toLowerCase();
  if (!domain || COMMON_EMAIL_DOMAINS.includes(domain)) return null;

  for (const known of COMMON_EMAIL_DOMAINS) {
    const distance = levenshtein(domain, known);
    if (distance > 0 && distance <= 2) {
      return email.slice(0, at + 1) + known;
    }
  }
  return null;
}

/**
 * Validates a phone number, accepting either a Nigerian local format
 * (e.g. 08012345678) or a full international format with a leading "+".
 * Returns the normalized E.164 form (e.g. +2348012345678) when valid, so
 * numbers get stored consistently regardless of how they were typed.
 */
export function validatePhoneNumber(value: string): { valid: boolean; e164?: string } {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false };

  const defaultCountry: CountryCode | undefined = trimmed.startsWith("+") ? undefined : "NG";
  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);

  if (!parsed || !parsed.isValid()) {
    return { valid: false };
  }

  return { valid: true, e164: parsed.number };
}