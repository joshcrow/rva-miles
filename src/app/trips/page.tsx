import type { Metadata } from "next";
import TripsScreen from "@/components/trips/TripsScreen";

export const metadata: Metadata = {
  title: "Trips — RVA Miles",
  description: "Every trip you have logged, a month at a time, with search across all of them.",
};

export default function TripsPage() {
  return <TripsScreen />;
}
