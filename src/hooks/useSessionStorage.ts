import { useState, useEffect } from "react";

// Helper to check if a value is a Set
const isSet = (val: any): val is Set<any> => {
  return val instanceof Set;
};

// Custom reviver for JSON.parse to revive Sets if we wrap them
// But for simplicity, we will just manage Sets manually if needed.

export function useSessionStorage<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        // If defaultValue was a Set, and we got an array from JSON, convert it back.
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

  useEffect(() => {
    try {
      let serializedValue = value;
      // Convert Set to Array for JSON.stringify
      if (isSet(value)) {
        serializedValue = Array.from(value) as any;
      }
      sessionStorage.setItem(key, JSON.stringify(serializedValue));
    } catch (e) {
      console.warn("Error saving to sessionStorage", e);
    }
  }, [key, value]);

  return [value, setValue];
}
