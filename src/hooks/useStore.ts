import { useSyncExternalStore } from "react";
import { store } from "@/lib/store";

export function useAppStore() {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  return { ...state, ...store };
}
