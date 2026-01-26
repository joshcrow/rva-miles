"use client";

import { useEffect, useState } from "react";

export function useHighContrast() {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("rva-miles-high-contrast");
    if (stored === "true") {
      setHighContrast(true);
      applyHighContrast(true);
    }
  }, []);

  const applyHighContrast = (enabled: boolean) => {
    if (enabled) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  };

  const toggleHighContrast = () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    localStorage.setItem("rva-miles-high-contrast", String(newValue));
    applyHighContrast(newValue);
  };

  return { highContrast, toggleHighContrast };
}
