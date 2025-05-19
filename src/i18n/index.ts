import { useEffect, useState } from 'react';

type Locale = 'en' | 'rw';

export const DEFAULT_LOCALE: Locale = 'en';

type TranslationKey =
    | 'climateInformationSystem'
    | 'dashboard'
    | 'forecasts'
    | 'historical'
    | 'alerts'
    | 'farmers'
    | 'messages'
    | 'settings'
    | 'todayForecast'
    | 'weeklyOverview'
    | 'recentActivity'
    | 'farmerGroups'
    | 'temperature'
    | 'rainfall'
    | 'humidity'
    | 'wind'
    | 'viewDetails'
    | 'sendMessage'
    | 'exportData'
    | 'search'
    | 'filterBy'
    | 'sortBy'
    | 'darkMode'
    | 'lightMode'
    | 'language'
    | 'compose'
    | 'selectRecipients'
    | 'messageTemplate'
    | 'schedule'
    | 'send'
    | 'farmersReached'
    | 'messagesDelivered'
    | 'alertsTriggered';

type TranslationDict = Record<TranslationKey, string>;

const translations: Record<Locale, TranslationDict> = {
    en: {
        "climateInformationSystem": "Climate Information System",
        "dashboard": "Dashboard",
        "forecasts": "Weather Forecasts",
        "historical": "Historical Data",
        "alerts": "Weather Alerts",
        "farmers": "Farmer Management",
        "messages": "Messaging",
        "settings": "Settings",

        "todayForecast": "Today's Forecast",
        "weeklyOverview": "Weekly Overview",
        "recentActivity": "Recent Activity",
        "farmerGroups": "Farmer Groups",

        "temperature": "Temperature",
        "rainfall": "Rainfall",
        "humidity": "Humidity",
        "wind": "Wind Speed",

        "viewDetails": "View Details",
        "sendMessage": "Send Message",
        "exportData": "Export Data",

        "search": "Search...",
        "filterBy": "Filter by",
        "sortBy": "Sort by",
        "darkMode": "Dark Mode",
        "lightMode": "Light Mode",
        "language": "Language",

        "compose": "Compose Message",
        "selectRecipients": "Select Recipients",
        "messageTemplate": "Message Template",
        "schedule": "Schedule",
        "send": "Send",

        "farmersReached": "Farmers Reached",
        "messagesDelivered": "Messages Delivered",
        "alertsTriggered": "Alerts Triggered"
    },
    rw: {
        "climateInformationSystem": "Sisitemu y'Amakuru y'Ibihe",
        "dashboard": "Ikibaho",
        "forecasts": "Iteganyagihe",
        "historical": "Amakuru y'amateka",
        "alerts": "Amakuru y'umutekano",
        "farmers": "Gucunga abahinzi",
        "messages": "Ubutumwa",
        "settings": "Igenamiterere",

        "todayForecast": "Iteganyagihe ry'uyu munsi",
        "weeklyOverview": "Incamake y'icyumweru",
        "recentActivity": "Ibikorwa bya vuba",
        "farmerGroups": "Amatsinda y'abahinzi",

        "temperature": "Ubushyuhe",
        "rainfall": "Imvura",
        "humidity": "Ubuhehere",
        "wind": "Umuvuduko w'umuyaga",

        "viewDetails": "Reba Ibisobanuro",
        "sendMessage": "Ohereza Ubutumwa",
        "exportData": "Kuramo Amakuru",

        "search": "Shakisha...",
        "filterBy": "Shungura ku...",
        "sortBy": "Tondeka ku...",
        "darkMode": "Ibara Ryijimye",
        "lightMode": "Ibara Ryerurutse",
        "language": "Ururimi",

        "compose": "Andika Ubutumwa",
        "selectRecipients": "Hitamo Abakiriya",
        "messageTemplate": "Imbata y'ubutumwa",
        "schedule": "Gahunda",
        "send": "Ohereza",

        "farmersReached": "Abahinzi Bagezweho",
        "messagesDelivered": "Ubutumwa Bwatanzwe",
        "alertsTriggered": "Imiburo Yatanzwe"
    }
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

    const t = (key: string, params?: Record<string, string>) => {
        let text = (translations[currentLocale][key as TranslationKey] || key);

        if (params) {
            Object.entries(params).forEach(([param, value]) => {
                text = text.replace(`{{${param}}}`, value);
            });
        }

        return text;
    };

    const changeLanguage = (locale: Locale) => {
        setCurrentLocale(locale);
        if (typeof window !== 'undefined') {
            localStorage.setItem('locale', locale);
        }
    };

    return {
        locale: currentLocale,
        t,
        changeLanguage,
        isRtl: false,
    };
};