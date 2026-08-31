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

/** Mask a PK mobile for display, e.g. +923001234567 → "+92 300 XXX XX67". */
export function maskPhone(phone: string | null | undefined): string {
  const p = normalizePhone(phone ?? "");
  if (!p) return phone ?? "";
  const m = p.replace(/^\+92/, ""); // 10 digits, 3XXXXXXXXX
  if (m.length !== 10) return p;
  return `+92 ${m.slice(0, 3)} XXX XX${m.slice(8)}`;
}
