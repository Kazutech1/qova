// User has no email field — derive a stable, unique placeholder per user for Nomba
// APIs that require an email (mandates, checkout, tokenized-card lookup).
// The tokenized-card list endpoint filters by email only, so this doubles as the
// lookup key for a user's saved cards. Keep it deterministic.
export function deriveEmail(phone: string): string {
  return `${phone.replace(/\D/g, '')}@qova.ng`;
}
