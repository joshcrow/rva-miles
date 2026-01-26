import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Trip, UserSettings } from "@/types";
import { getStaticMapUrl } from "./googleMaps";
import { formatDistance, formatDollarAmount } from "./geo";

export interface ExportOptions {
  includeMaps?: boolean;
  maxTrips?: number;
  onProgress?: (current: number, total: number) => void;
  abortSignal?: AbortSignal;
}

async function fetchWithTimeout(url: string, timeout: number): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export function generateCSV(trips: Trip[], settings: UserSettings): string {
  const headers = [
    "Date",
    "Start Time",
    "End Time",
    "Start Location",
    "End Location",
    "Distance (mi)",
    "Reimbursement",
    "Purpose",
    "Category",
    "Type",
  ];

  const rows = trips.map((trip) => {
    const date = new Date(trip.startTime).toLocaleDateString();
    const startTime = new Date(trip.startTime).toLocaleTimeString();
    const endTime = trip.endTime ? new Date(trip.endTime).toLocaleTimeString() : "In Progress";
    const startLoc = trip.startAddress || `${trip.startLocation.lat.toFixed(4)}, ${trip.startLocation.lng.toFixed(4)}`;
    const endLoc = trip.endAddress || (trip.endLocation ? `${trip.endLocation.lat.toFixed(4)}, ${trip.endLocation.lng.toFixed(4)}` : "");
    const distance = trip.distanceMiles.toFixed(2);
    const reimbursement = formatDollarAmount(trip.distanceMiles, settings.irsRate);
    const purpose = trip.purpose || "";
    const category = trip.category || "";
    const type = trip.estimatedRoute ? "Estimated" : trip.isManualEntry ? "Manual" : "GPS Tracked";

    return [date, startTime, endTime, startLoc, endLoc, distance, reimbursement, purpose, category, type];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return csvContent;
}

export async function generatePDF(
  trips: Trip[],
  settings: UserSettings,
  options: ExportOptions = {}
): Promise<Blob> {
  const { includeMaps = false, maxTrips = 50, onProgress, abortSignal } = options;

  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text("Mileage Report", 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
  doc.text(`IRS Rate: ${formatDollarAmount(1, settings.irsRate)}/mile`, 14, 34);

  const totalMiles = trips.reduce((sum, trip) => sum + trip.distanceMiles, 0);
  const totalReimbursement = totalMiles * settings.irsRate;
  doc.text(`Total Miles: ${totalMiles.toFixed(2)} mi`, 14, 40);
  doc.text(`Total Reimbursement: ${formatDollarAmount(totalMiles, settings.irsRate)}`, 14, 46);

  const tableData = trips.map((trip) => [
    new Date(trip.startTime).toLocaleDateString(),
    trip.startAddress || `${trip.startLocation.lat.toFixed(4)}, ${trip.startLocation.lng.toFixed(4)}`,
    trip.endAddress || (trip.endLocation ? `${trip.endLocation.lat.toFixed(4)}, ${trip.endLocation.lng.toFixed(4)}` : ""),
    trip.distanceMiles.toFixed(2),
    formatDollarAmount(trip.distanceMiles, settings.irsRate),
    trip.purpose || "",
  ]);

  autoTable(doc, {
    startY: 52,
    head: [["Date", "Start", "End", "Miles", "Amount", "Purpose"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 },
  });

  if (includeMaps) {
    const tripsWithMaps = trips.slice(0, maxTrips);
    
    for (let i = 0; i < tripsWithMaps.length; i++) {
      if (abortSignal?.aborted) {
        throw new Error("PDF generation cancelled");
      }

      if (onProgress) {
        onProgress(i + 1, tripsWithMaps.length);
      }

      const trip = tripsWithMaps[i];
      const mapUrl = getStaticMapUrl(trip);

      if (mapUrl) {
        try {
          const base64Data = await fetchWithTimeout(mapUrl, 10000);
          
          doc.addPage();
          doc.setFontSize(12);
          doc.text(`Trip ${i + 1}: ${new Date(trip.startTime).toLocaleDateString()}`, 14, 20);
          doc.setFontSize(10);
          doc.text(`Distance: ${trip.distanceMiles.toFixed(2)} mi`, 14, 28);
          doc.text(`Amount: ${formatDollarAmount(trip.distanceMiles, settings.irsRate)}`, 14, 34);
          
          if (base64Data.startsWith("data:image")) {
            doc.addImage(base64Data, "PNG", 14, 40, 180, 180);
          }
        } catch (error) {
          console.error(`Failed to load map for trip ${i + 1}:`, error);
          doc.addPage();
          doc.text(`Trip ${i + 1}: Map unavailable`, 14, 20);
        }
      }
    }
  }

  return doc.output("blob");
}

export function generateExcel(trips: Trip[], settings: UserSettings): ArrayBuffer {
  const data = trips.map((trip) => ({
    Date: new Date(trip.startTime).toLocaleDateString(),
    "Start Time": new Date(trip.startTime).toLocaleTimeString(),
    "End Time": trip.endTime ? new Date(trip.endTime).toLocaleTimeString() : "In Progress",
    "Start Location": trip.startAddress || `${trip.startLocation.lat.toFixed(4)}, ${trip.startLocation.lng.toFixed(4)}`,
    "End Location": trip.endAddress || (trip.endLocation ? `${trip.endLocation.lat.toFixed(4)}, ${trip.endLocation.lng.toFixed(4)}` : ""),
    "Distance (mi)": parseFloat(trip.distanceMiles.toFixed(2)),
    "Reimbursement": parseFloat((trip.distanceMiles * settings.irsRate).toFixed(2)),
    Purpose: trip.purpose || "",
    Category: trip.category || "",
    Type: trip.estimatedRoute ? "Estimated" : trip.isManualEntry ? "Manual" : "GPS Tracked",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + "1";
    if (!worksheet[address]) continue;
    worksheet[address].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: "3B82F6" } },
    };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Mileage Report");

  return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}
