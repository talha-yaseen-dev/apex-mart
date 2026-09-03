"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAccountActiveAction } from "@/lib/actions/access";

/**
 * Primary-admin control to deactivate (suspend sign-in) or reactivate an
 * account. Passing the current `deactivated` state flips it on click.
 */
export function AccountActiveToggle({
  userId,
  deactivated,
}: {
  userId: string;
  deactivated: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setErr("");
    setBusy(true);
    const res = await setAccountActiveAction(userId, deactivated);
    setBusy(false);
    if (!res.ok) setErr(res.error);
    else router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={run}
        disabled={busy}
        className={
          deactivated
            ? "text-[12.5px] font-semibold text-primary-hover hover:underline disabled:opacity-50"
            : "text-[12.5px] font-semibold text-destructive hover:underline disabled:opacity-50"
        }
      >
        {deactivated ? "Reactivate" : "Deactivate"}
      </button>
      {err && <span className="max-w-[180px] text-right text-[11px] text-destructive">{err}</span>}
    </div>
  );
}
