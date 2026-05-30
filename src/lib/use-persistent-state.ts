"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "@/lib/safe-storage";

type Updater<T> = T | ((prev: T) => T);

export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  parse: (raw: string) => T,
  serialize: (value: T) => string
): [T, (next: Updater<T>) => void] {
  const cacheRef = useRef<{ raw: string | null; value: T }>({
    raw: null,
    value: defaultValue,
  });

  const subscribe = useCallback(
    (onChange: () => void) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) onChange();
      };
      const onLocal = () => onChange();
      window.addEventListener("storage", onStorage);
      window.addEventListener(`pstate:${key}`, onLocal);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(`pstate:${key}`, onLocal);
      };
    },
    [key]
  );

  const getSnapshot = useCallback((): T => {
    const raw = readStorage(key);
    if (raw === cacheRef.current.raw) return cacheRef.current.value;
    const value = raw === null ? defaultValue : parse(raw);
    cacheRef.current = { raw, value };
    return value;
  }, [key, defaultValue, parse]);

  const getServerSnapshot = useCallback((): T => defaultValue, [defaultValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: Updater<T>) => {
      const resolved =
        typeof next === "function"
          ? (next as (prev: T) => T)(getSnapshot())
          : next;
      writeStorage(key, serialize(resolved));
      window.dispatchEvent(new Event(`pstate:${key}`));
    },
    [key, serialize, getSnapshot]
  );

  return [value, setValue];
}
