import type { Metadata } from "next";
import { TrackClient } from "@/components/track/TrackClient";

export const metadata: Metadata = {
  title: "Track order",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ ref?: string; phone?: string }>;
};

export default async function TrackPage({ searchParams }: PageProps) {
  const { ref, phone } = await searchParams;
  return <TrackClient initialRef={ref} initialPhone={phone} />;
}
