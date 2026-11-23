/**
 * Return / "report a problem" reasons — shared by the client form (renders the
 * <select>) and the server action (validates the submitted value). Kept in a
 * plain module (not the "use server" action file, whose every export must be an
 * async server action) so both sides import the exact same list.
 */

export const RETURN_REASONS = [
  { value: "wrong_item", label: "Wrong item received" },
  { value: "damaged", label: "Damaged / defective" },
  { value: "missing", label: "Missing item" },
  { value: "quality", label: "Quality issue" },
  { value: "other", label: "Other" },
] as const;

export type ReturnReasonValue = (typeof RETURN_REASONS)[number]["value"];

/** Max length for the optional free-text note. */
export const MAX_RETURN_NOTE = 500;

/** Friendly label for a submitted reason value, or null if unrecognised. */
export function reasonLabel(value: string): string | null {
  return RETURN_REASONS.find((r) => r.value === value)?.label ?? null;
}
