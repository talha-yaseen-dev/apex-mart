import { Skeleton } from "@/components/ui/skeleton";

export default function OrderDetailLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="mt-3 h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-32" />
      <Skeleton className="mt-6 h-40 rounded-2xl" />
      <Skeleton className="mt-6 h-48 rounded-2xl" />
      <Skeleton className="mt-6 h-24 rounded-2xl" />
    </div>
  );
}
