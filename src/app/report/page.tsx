import type { Metadata } from "next";
import ReportScreen from "@/components/report/ReportScreen";

export const metadata: Metadata = {
  title: "Report — RVA Miles",
  description: "Pick a pay period and send the mileage report.",
};

export default function ReportPage() {
  return <ReportScreen />;
}
