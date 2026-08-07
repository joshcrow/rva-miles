"use client";

import { useState } from "react";

/**
 * Local editable copy of a prop-derived value that resyncs whenever the
 * source changes (a save round-tripping through props, or a refresh
 * reverting an optimistic update) without fighting in-progress typing.
 * Uses React's "adjust state during render" pattern rather than a
 * setState-in-effect, per https://react.dev/learn/you-might-not-need-an-effect
 * — comparing primitives, so value (not reference) equality is what matters.
 */
export function useSyncedField<S>(source: S): [S, (next: S) => void] {
  const [value, setValue] = useState(source);
  const [prevSource, setPrevSource] = useState(source);
  if (source !== prevSource) {
    setPrevSource(source);
    setValue(source);
  }
  return [value, setValue];
}

export default useSyncedField;
