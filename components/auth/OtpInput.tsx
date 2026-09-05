"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

/**
 * Accessible 6-box one-time-code input. Controlled via `value` (0–6 digits) and
 * `onChange`. Handles: numeric-only entry, auto-advance, Backspace that steps
 * back, arrow-key navigation, and pasting a full 6-digit code into any box.
 * Each box is a labelled input with a visible focus ring; the group is announced
 * to screen readers. `inputMode="numeric"` brings up the numeric keypad on mobile.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
  ariaLabel = "6-digit verification code",
  ariaInvalid = false,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
  ariaInvalid?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const focus = (i: number) => refs.current[Math.max(0, Math.min(5, i))]?.focus();

  const emit = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, 6);
    onChange(clean);
    if (clean.length === 6) onComplete?.(clean);
    return clean;
  };

  const setAt = (i: number, digit: string) => {
    const arr = digits.slice();
    arr[i] = digit;
    return emit(arr.join(""));
  };

  const handleChange = (i: number, raw: string) => {
    const only = raw.replace(/\D/g, "");
    if (!only) {
      setAt(i, "");
      return;
    }
    // Typing into a box: take the last entered digit, then advance.
    if (only.length === 1) {
      setAt(i, only);
      focus(i + 1);
    } else {
      // Some IMEs/autofill deliver multiple chars — treat as a paste from here.
      const merged = (digits.slice(0, i).join("") + only).slice(0, 6);
      const clean = emit(merged);
      focus(clean.length);
    }
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        setAt(i, "");
      } else if (i > 0) {
        setAt(i - 1, "");
        focus(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(i + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const clean = emit(e.clipboardData.getData("text"));
    focus(clean.length);
  };

  return (
    <div role="group" aria-label={ariaLabel} className="flex justify-between gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={ariaInvalid}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`h-12 w-full min-w-0 rounded-xl border bg-background text-center text-lg font-bold text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 ${
            ariaInvalid ? "border-red-400" : "border-input"
          }`}
        />
      ))}
    </div>
  );
}
