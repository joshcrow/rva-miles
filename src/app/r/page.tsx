import type { Metadata } from "next";
import ReportViewer from "@/components/report/ReportViewer";

// The report lives entirely in the URL fragment, which browsers never send to
// a server — so there is nothing here to render server-side and nothing worth
// indexing. The viewer sets a more specific document.title once it decodes.
export const metadata: Metadata = {
  title: "Mileage Report",
  robots: { index: false, follow: false },
};

export default function SharedReportPage() {
  return <ReportViewer />;
}
