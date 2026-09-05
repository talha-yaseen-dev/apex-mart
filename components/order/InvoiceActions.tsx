"use client";

import Link from "next/link";
import { Download, ArrowLeft } from "lucide-react";

/**
 * Invoice action bar (hidden when printing). "Download PDF" opens the browser
 * print dialog — the page is print-styled, so "Save as PDF" produces a clean
 * one-page invoice.
 */
export function InvoiceActions({ backHref }: { backHref: string }) {
  return (
    <div className="mb-5 flex items-center gap-2.5 print:hidden">
      <Link
        href={backHref}
        className="tap-target inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-input px-4 text-sm font-bold text-foreground hover:bg-muted"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="tap-target ml-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground hover:bg-primary/90"
      >
        <Download className="size-4" aria-hidden /> Download PDF
      </button>
    </div>
  );
}
