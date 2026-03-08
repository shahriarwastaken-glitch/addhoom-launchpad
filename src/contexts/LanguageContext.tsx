import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'bn' | 'en';

const LanguageContext = createContext<{
  lang: Language;
  toggle: () => void;
  t: (bn: string, en: string) => string;
}>({ lang: 'bn', toggle: () => {}, t: (bn) => bn });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'bn';
    return (localStorage.getItem('addhoom-lang') as Language) || 'en';
  });
  const toggle = () => setLang(l => {
    const next = l === 'bn' ? 'en' : 'bn';
    localStorage.setItem('addhoom-lang', next);
    return next;
  });
  const t = (bn: string, en: string) => lang === 'bn' ? bn : en;
  return (
    <LanguageContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
