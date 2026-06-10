import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation files
import commonEN from './locales/en/common.json';
import commonFR from './locales/fr/common.json';
import commonES from './locales/es/common.json';
import homeEN from './locales/en/home.json';
import homeFR from './locales/fr/home.json';
import homeES from './locales/es/home.json';
import subscriptionEN from './locales/en/subscription.json';
import subscriptionFR from './locales/fr/subscription.json';
import subscriptionES from './locales/es/subscription.json';
import legalEN from './locales/en/legal.json';
import legalFR from './locales/fr/legal.json';
import legalES from './locales/es/legal.json';
import contractEN from './locales/en/contract.json';
import contractFR from './locales/fr/contract.json';
import contractES from './locales/es/contract.json';
import contractSecureEN from './locales/en/contractSecure.json';
import contractSecureFR from './locales/fr/contractSecure.json';
import contractSecureES from './locales/es/contractSecure.json';
import pdfIntegrationEN from './locales/en/pdfIntegration.json';
import pdfIntegrationFR from './locales/fr/pdfIntegration.json';
import pdfIntegrationES from './locales/es/pdfIntegration.json';
import authEN from './locales/en/auth.json';
import authFR from './locales/fr/auth.json';
import authES from './locales/es/auth.json';

const resources = {
  en: {
    common: commonEN,
    home: homeEN,
    subscription: subscriptionEN,
    legal: legalEN,
    contract: contractEN,
    contractSecure: contractSecureEN,
    pdfIntegration: pdfIntegrationEN,
    auth: authEN,
  },
  fr: {
    common: commonFR,
    home: homeFR,
    subscription: subscriptionFR,
    legal: legalFR,
    contract: contractFR,
    contractSecure: contractSecureFR,
    pdfIntegration: pdfIntegrationFR,
    auth: authFR,
  },
  es: {
    common: commonES,
    home: homeES,
    subscription: subscriptionES,
    legal: legalES,
    contract: contractES,
    contractSecure: contractSecureES,
    pdfIntegration: pdfIntegrationES,
    auth: authES,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    lng: 'fr',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    ns: ['common', 'home', 'subscription', 'legal', 'contract', 'contractSecure', 'pdfIntegration', 'auth'],
    defaultNS: 'common',
  });

export default i18n;