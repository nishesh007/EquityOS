"use client";

import { useRef, type DependencyList } from "react";

interface MemoSnapshot<T> {
  deps: DependencyList;
  value: T;
}

function depsChanged(prev: DependencyList, next: DependencyList): boolean {
  if (prev.length !== next.length) return true;
  return prev.some((dep, index) => !Object.is(dep, next[index]));
}

/**
 * Memoize a computed value with an explicit dependency list.
 * Mirrors useMemo while keeping the factory ref-stable across renders.
 */
export function useMemoizedValue<T>(factory: () => T, deps: DependencyList): T {
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  const snapshotRef = useRef<MemoSnapshot<T> | null>(null);

  if (
    snapshotRef.current === null ||
    depsChanged(snapshotRef.current.deps, deps)
  ) {
    snapshotRef.current = {
      deps: [...deps],
      value: factoryRef.current(),
    };
  }

  return snapshotRef.current.value;
}
