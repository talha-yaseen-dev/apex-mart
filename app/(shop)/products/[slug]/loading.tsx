import { Skeleton } from "@/components/ui/skeleton";

/** PDP loading skeleton. */
export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4">
      <Skeleton className="h-4 w-56" />
      <div className="mt-3 grid gap-6 lg:grid-cols-2">
        <div className="-mx-4 sm:mx-0">
          <Skeleton className="aspect-square w-full sm:rounded-2xl" />
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-9 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-11 w-20 rounded-xl" />
            <Skeleton className="h-11 w-20 rounded-xl" />
            <Skeleton className="h-11 w-20 rounded-xl" />
          </div>
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
