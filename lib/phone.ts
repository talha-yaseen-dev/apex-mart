/**
 * Pakistani mobile number handling (client-safe — no server imports).
 * Accepts 03XXXXXXXXX, +923XXXXXXXXX, 00923XXXXXXXXX, 923XXXXXXXXX, 3XXXXXXXXX
 * and normalises to the canonical +923XXXXXXXXX. Returns null if invalid.
 */
export function normalizePhone(raw: string): string | null {
  let m = (raw || "").replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (m.startsWith("0092")) m = m.slice(4);
  else if (m.startsWith("92")) m = m.slice(2);
  else if (m.startsWith("0")) m = m.slice(1);
  if (!/^3\d{9}$/.test(m)) return null; // PK mobiles are 3XX XXXXXXX
  return `+92${m}`;
}

export const isValidPKPhone = (raw: string): boolean => normalizePhone(raw) !== null;
