import { useState, useEffect, useMemo } from "react";
import { useAuth } from "./useAuth";

// Helper to check if a value is a Set
const isSet = (val: any): val is Set<any> => {
  return val instanceof Set;
};

export function useSessionStorage<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const { user } = useAuth();
  
  // Scope the key to the current user to prevent leakage between accounts on same browser
  const scopedKey = useMemo(() => {
    if (!user) return `guest_${key}`;
    return `${user.id}_${key}`;
  }, [user?.id, key]);

  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(scopedKey);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (isSet(defaultValue) && Array.isArray(parsed)) {
          return new Set(parsed) as any;
        }
        return parsed;
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  });

  // Re-sync if the user changes (e.g. logout/login)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(scopedKey);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      } else {
        setValue(defaultValue);
      }
    } catch {
      setValue(defaultValue);
    }
  }, [scopedKey]);

  useEffect(() => {
    try {
      let serializedValue = value;
      if (isSet(value)) {
        serializedValue = Array.from(value) as any;
      }
      sessionStorage.setItem(scopedKey, JSON.stringify(serializedValue));
    } catch (e) {
      console.warn("Error saving to sessionStorage", e);
    }
  }, [scopedKey, value]);

  return [value, setValue];
}
