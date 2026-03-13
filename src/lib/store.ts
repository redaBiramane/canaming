// Global state management using vanilla store + localStorage persistence
import { DictionaryEntry, HistoryEntry, DEFAULT_DICTIONARY, generateId } from './dictionary';

// Simple zustand-like store using vanilla JS + events
type Listener = () => void;

interface AppState {
  dictionary: DictionaryEntry[];
  history: HistoryEntry[];
  transformationCount: number;
  unknownWordsCount: number;
  role: "admin" | "user";
}

const STORAGE_KEY = "ca-naming-studio";

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...getDefaultState(), ...parsed };
    }
  } catch {}
  return getDefaultState();
}

function getDefaultState(): AppState {
  return {
    dictionary: DEFAULT_DICTIONARY,
    history: [],
    transformationCount: 0,
    unknownWordsCount: 0,
    role: "admin",
  };
}

let state = loadState();
const listeners = new Set<Listener>();

function notify() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export const store = {
  getState: () => state,
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setRole: (role: "admin" | "user") => {
    state = { ...state, role };
    notify();
  },

  addEntry: (entry: Omit<DictionaryEntry, "id" | "date_maj">) => {
    const newEntry: DictionaryEntry = {
      ...entry,
      id: generateId(),
      date_maj: new Date().toISOString().split("T")[0],
    };
    state = {
      ...state,
      dictionary: [...state.dictionary, newEntry],
      history: [
        {
          id: generateId(),
          date: new Date().toISOString(),
          auteur: entry.auteur,
          action: "ajout",
          terme: entry.terme_source,
          nouvelle_valeur: entry.abreviation,
        },
        ...state.history,
      ],
    };
    notify();
  },

  updateEntry: (id: string, updates: Partial<DictionaryEntry>, auteur: string) => {
    const old = state.dictionary.find((e) => e.id === id);
    if (!old) return;
    const updated = { ...old, ...updates, date_maj: new Date().toISOString().split("T")[0], auteur };
    state = {
      ...state,
      dictionary: state.dictionary.map((e) => (e.id === id ? updated : e)),
      history: [
        {
          id: generateId(),
          date: new Date().toISOString(),
          auteur,
          action: "modification",
          terme: old.terme_source,
          ancienne_valeur: old.abreviation,
          nouvelle_valeur: updated.abreviation,
          champ: Object.keys(updates).join(", "),
        },
        ...state.history,
      ],
    };
    notify();
  },

  deleteEntry: (id: string, auteur: string) => {
    const old = state.dictionary.find((e) => e.id === id);
    if (!old) return;
    state = {
      ...state,
      dictionary: state.dictionary.filter((e) => e.id !== id),
      history: [
        {
          id: generateId(),
          date: new Date().toISOString(),
          auteur,
          action: "suppression",
          terme: old.terme_source,
          ancienne_valeur: old.abreviation,
        },
        ...state.history,
      ],
    };
    notify();
  },

  importDictionary: (entries: DictionaryEntry[], auteur: string) => {
    state = {
      ...state,
      dictionary: entries,
      history: [
        {
          id: generateId(),
          date: new Date().toISOString(),
          auteur,
          action: "import",
          terme: `${entries.length} termes importés`,
        },
        ...state.history,
      ],
    };
    notify();
  },

  incrementTransformations: (count: number = 1, unknowns: number = 0) => {
    state = {
      ...state,
      transformationCount: state.transformationCount + count,
      unknownWordsCount: state.unknownWordsCount + unknowns,
    };
    notify();
  },
};
