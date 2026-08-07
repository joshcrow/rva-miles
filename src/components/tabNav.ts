"use client";

// Native tab grammar: switching tabs is instant (no entry animation) and the
// tab you return to is exactly as you left it — including scroll position.
// BottomNav marks a switch just before navigating; the route template consumes
// the mark to skip the drill-in animation and restore the saved scroll.

const scrollByPath = new Map<string, number>();
let tabSwitch = false;

export function markTabSwitch(fromPath: string): void {
  scrollByPath.set(fromPath, window.scrollY);
  tabSwitch = true;
}

export function consumeTabSwitch(): boolean {
  const was = tabSwitch;
  tabSwitch = false;
  return was;
}

export function savedScrollFor(path: string): number {
  return scrollByPath.get(path) ?? 0;
}
