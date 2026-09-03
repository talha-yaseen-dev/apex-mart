"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminCategory } from "@/lib/admin";
import { createCategoryAction, deleteCategoryAction } from "@/lib/actions/admin";

export function CategoriesManager({
  categories,
  canManage,
  canDelete,
}: {
  categories: AdminCategory[];
  canManage: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  function create() {
    setErr("");
    start(async () => {
      const res = await createCategoryAction({ name });
      if (!res.ok) return setErr(res.error);
      setOpen(false);
      setName("");
      router.refresh();
    });
  }

  function remove(c: AdminCategory) {
    setErr("");
    start(async () => {
      const res = await deleteCategoryAction(c.id);
      if (!res.ok) return setErr(res.error);
      router.refresh();
    });
  }

  return (
    <div className="animate-fade">
      <div className="mb-1.5 flex items-center">
        <h1 className="font-display text-2xl font-bold tracking-tight">Categories</h1>
        {canManage && (
          <button
            onClick={() => {
              setErr("");
              setOpen((o) => !o);
            }}
            className="ml-auto h-10 rounded-lg bg-primary px-4 text-[13.5px] font-bold text-white hover:bg-primary-hover"
          >
            {open ? "Close" : "+ New category"}
          </button>
        )}
      </div>
      <p className="mb-5 text-[13px] text-muted-foreground">
        Products are filed under a category. Add your own here — they appear in the
        “Add product” form.
      </p>

      {open && (
        <div className="mb-4 rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              autoFocus
              placeholder="Category name (e.g. Skincare)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim().length >= 2 && !pending) create();
              }}
              className="h-10 flex-1 rounded-lg border bg-card px-3 text-[13px] focus:border-primary focus:outline-none"
            />
            <button
              onClick={create}
              disabled={pending || name.trim().length < 2}
              className="h-10 rounded-lg bg-primary px-5 text-[13px] font-bold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {pending ? "Adding…" : "Add category"}
            </button>
          </div>
          <div className="mt-1 min-h-4 text-xs text-destructive">{err}</div>
        </div>
      )}

      {!open && err && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-[13px] text-destructive">
          {err}
        </div>
      )}

      {/* Mobile: stacked cards so every field fits on a phone screen. */}
      <div className="space-y-2.5 sm:hidden">
        {categories.map((c) => (
          <div key={c.id} className="rounded-xl border bg-card p-3.5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{c.name}</div>
                <div className="truncate font-mono text-[12px] text-muted-foreground">
                  /{c.slug}
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                {c.productCount} {c.productCount === 1 ? "product" : "products"}
              </span>
            </div>
            {canDelete && (
              <div className="mt-3 flex justify-end border-t pt-2.5">
                {c.productCount === 0 ? (
                  <button
                    disabled={pending}
                    onClick={() => remove(c)}
                    className="text-[12.5px] font-semibold text-destructive hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                ) : (
                  <span className="text-[12px] font-medium text-muted-foreground/70">
                    Move or delete its products to remove
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <div className="rounded-xl border bg-card px-4 py-10 text-center text-muted-foreground">
            No categories yet — add one to start listing products.
          </div>
        )}
      </div>

      {/* Desktop: full table. */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card sm:block">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Slug</th>
              <th className="px-4 py-2.5 font-semibold">Products</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{c.slug}</td>
                <td className="px-4 py-3 tabular-nums">{c.productCount}</td>
                <td className="px-4 py-3 text-right">
                  {canDelete &&
                    (c.productCount === 0 ? (
                      <button
                        disabled={pending}
                        onClick={() => remove(c)}
                        className="text-[12.5px] font-semibold text-destructive hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    ) : (
                      <span
                        title="Move or delete its products first"
                        className="cursor-not-allowed text-[12.5px] font-medium text-muted-foreground/60"
                      >
                        Delete
                      </span>
                    ))}
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  No categories yet — add one to start listing products.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
