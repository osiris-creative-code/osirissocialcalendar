"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Language } from "@/lib/types";
import { translate, type TranslationKey } from "./dict";

const STORAGE_KEY = "osiris-lang";

type Ctx = { lang: Language; setLang: (l: Language) => void; t: (k: TranslationKey) => string };

const LanguageContext = createContext<Ctx>({
  lang: "tr",
  setLang: () => {},
  t: (k) => translate("tr", k),
});

/** Remembers the reader's choice; the developer setting only supplies the default. */
export function LanguageProvider({
  defaultLanguage = "tr",
  children,
}: {
  defaultLanguage?: Language;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Language>(defaultLanguage);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "tr" || saved === "en") setLangState(saved);
    } catch {
      /* private mode — the default is fine */
    }
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute("lang", next);
  }, []);

  const t = useCallback((key: TranslationKey) => translate(lang, key), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): Ctx {
  return useContext(LanguageContext);
}
