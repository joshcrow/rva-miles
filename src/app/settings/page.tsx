import type { Metadata } from "next";
import SettingsScreen from "@/components/settings/SettingsScreen";

export const metadata: Metadata = {
  title: "Settings — RVA Miles",
  description: "Profile, pay schedule, recipient, backups, and sync.",
};

export default function SettingsPage() {
  return <SettingsScreen />;
}
