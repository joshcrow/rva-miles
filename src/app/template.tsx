import type { ReactNode } from "react";

// A template remounts on every route change (a layout does not), which is
// what re-triggers the .route-enter animation per tab switch.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="route-enter">{children}</div>;
}
