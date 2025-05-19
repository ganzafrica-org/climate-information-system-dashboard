import { useState, useEffect } from 'react';
import enTranslations from '@/locales/en.json';
import rwTranslations from '@/locales/rw.json';

export type Locale = 'en' | 'rw';
export const DEFAULT_LOCALE: Locale = 'rw';

type TranslationValue = string | { [key: string]: TranslationValue };
type Translations = { [key: string]: TranslationValue };

const translations: Record<Locale, Translations> = {
    en: enTranslations,
    rw: rwTranslations
};

export const useLanguage = () => {
    const [currentLocale, setCurrentLocale] = useState<Locale>(DEFAULT_LOCALE);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedLocale = localStorage.getItem('locale') as Locale;
            if (savedLocale && (savedLocale === 'en' || savedLocale === 'rw')) {
                setCurrentLocale(savedLocale);
            }
        }
    }, []);

    const t = (key: string, params?: Record<string, string | number>) => {
        const parts = key.split('.');
        let translation: TranslationValue = translations[currentLocale];

        for (const part of parts) {
            if (typeof translation !== 'string' && translation && part in translation) {
                translation = translation[part];
            } else {
                return key;
            }
        }

        let text = typeof translation === 'string' ? translation : key;

        if (params) {
            Object.entries(params).forEach(([param, value]) => {
                const regex = new RegExp(`{{${param}}}`, 'g');
                text = text.replace(regex, String(value));
            });
        }

        return text;
    };

    const changeLanguage = (locale: Locale) => {
        setCurrentLocale(locale);
        if (typeof window !== 'undefined') {
            localStorage.setItem('locale', locale);
            window.location.reload();
        }
    };

    return {
        locale: currentLocale,
        t,
        changeLanguage,
        isRtl: false,
    };
};