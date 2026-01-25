"use client";

import { useState, useEffect } from "react";

export type Platform = "ios" | "android" | "desktop" | "unknown";

interface PlatformInfo {
  platform: Platform;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  isPWA: boolean;
}

export function usePlatform(): PlatformInfo {
  const [info, setInfo] = useState<PlatformInfo>({
    platform: "unknown",
    isIOS: false,
    isAndroid: false,
    isMobile: false,
    isDesktop: true,
    isPWA: false,
  });

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();

    const isIOS = /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const isAndroid = /android/.test(ua);

    const isMobile = isIOS || isAndroid;

    // Check if running as installed PWA
    const isPWA = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    let platform: Platform = "unknown";
    if (isIOS) platform = "ios";
    else if (isAndroid) platform = "android";
    else if (!isMobile) platform = "desktop";

    setInfo({
      platform,
      isIOS,
      isAndroid,
      isMobile,
      isDesktop: !isMobile,
      isPWA,
    });
  }, []);

  return info;
}
