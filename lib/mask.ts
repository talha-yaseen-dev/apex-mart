/**
 * Client-safe display helpers for partially hiding contact details in the UI
 * (e.g. the "check your email" screen). Pure — no server-only imports.
 */

/** "talha@gmail.com" → "t***@gmail.com". Falls back to the input if malformed. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local.slice(0, 1)}***@${domain}`;
}
