"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Order reference with a copy-to-clipboard button. */
export function CopyRef({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy order reference ${value}`}
      className="tap-target inline-flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 font-mono text-sm font-bold text-foreground transition-colors hover:bg-muted"
    >
      {value}
      {copied ? (
        <Check className="size-4 text-primary" />
      ) : (
        <Copy className="size-4 text-muted-foreground" />
      )}
    </button>
  );
}
