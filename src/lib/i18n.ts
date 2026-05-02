import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import fr from '../locales/fr.json';
import en from '../locales/en.json';

const translations: Record<string, any> = { fr, en };

type Language = 'fr' | 'en';

interface I18nState {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      lang: 'fr',
      setLang: (lang) => set({ lang }),
      t: (key: string) => {
        const lang = get().lang;
        const keys = key.split('.');
        let current = translations[lang];
        
        for (const k of keys) {
          if (current === undefined || current[k] === undefined) {
            // Fallback to FR if key is missing in EN
            let fallback = translations['fr'];
            for (const fk of keys) {
              if (fallback === undefined || fallback[fk] === undefined) return key;
              fallback = fallback[fk];
            }
            return fallback as string;
          }
          current = current[k];
        }
        return current as string;
      },
    }),
    {
      name: 'canaming-lang',
    }
  )
);
