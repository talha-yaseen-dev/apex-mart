import { Skeleton } from "@/components/ui/skeleton";

/** Loading skeleton shown while a category listing streams in. */
export default function CategoryLoading() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-24 w-full rounded-3xl" />
      <div className="mt-4 flex items-center gap-3 border-b border-border py-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="ml-auto h-9 w-28 rounded-lg" />
      </div>
      <div className="mt-4 flex gap-6">
        <div className="hidden w-56 shrink-0 flex-col gap-4 lg:flex">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="flex flex-col gap-2 p-3">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="mt-1 h-10 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
