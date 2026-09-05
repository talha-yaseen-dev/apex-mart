"use client";

import { useId, useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Eye, EyeOff, Check } from "lucide-react";
import { passwordChecks } from "@/lib/validations/auth";
import { authInputCls } from "./AuthUI";

/**
 * Password input with a show/hide toggle and live, server-mirrored requirement
 * feedback (8+ chars, uppercase, number, symbol). The checklist reflects the
 * exact `passwordChecks` the server enforces, so client and server never
 * disagree. Fully labelled and keyboard-accessible.
 */
export function PasswordField({
  label = "Password",
  value,
  error,
  registration,
  autoComplete = "new-password",
  showChecklist = true,
}: {
  label?: string;
  value: string;
  error?: string;
  registration: UseFormRegisterReturn;
  autoComplete?: string;
  showChecklist?: boolean;
}) {
  const [show, setShow] = useState(false);
  const id = useId();
  const reqsId = `${id}-reqs`;
  const checks = passwordChecks(value ?? "");

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder="••••••••"
          aria-invalid={error ? true : undefined}
          aria-describedby={showChecklist ? reqsId : undefined}
          className={`${authInputCls} pr-11`}
          {...registration}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-label={show ? "Hide password" : "Show password"}
          className="tap-target absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>

      {error && (
        <p className="mt-1 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      {showChecklist && (
        <ul
          id={reqsId}
          aria-live="polite"
          className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1"
        >
          {checks.map((c) => (
            <li
              key={c.label}
              className={`flex items-center gap-1.5 text-xs ${c.ok ? "font-medium text-primary" : "text-muted-foreground"}`}
            >
              <span
                aria-hidden
                className={`flex size-3.5 shrink-0 items-center justify-center rounded-full ${c.ok ? "bg-primary text-white" : "border border-current"}`}
              >
                {c.ok && <Check className="size-2.5" strokeWidth={3.5} />}
              </span>
              <span className="sr-only">{c.ok ? "requirement met:" : "requirement not met:"}</span>
              {c.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
