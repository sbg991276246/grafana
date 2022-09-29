import i18n, { BackendModule, ResourceKey } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LOCALE, ENGLISH_US, FRENCH_FRANCE, SPANISH_SPAIN, PSEUDO_LOCALE, VALID_LOCALES } from './constants';

const messageLoaders: Record<string, () => Promise<ResourceKey>> = {
  [ENGLISH_US]: () => import('../../../locales/en-US/grafana.json'),
  [FRENCH_FRANCE]: () => import('../../../locales/fr-FR/grafana.json'),
  [SPANISH_SPAIN]: () => import('../../../locales/es-ES/grafana.json'),
  [PSEUDO_LOCALE]: () => import('../../../locales/pseudo-LOCALE/grafana.json'),
};

const loadTranslations: BackendModule = {
  type: 'backend',
  init() {},
  async read(language, namespace, callback) {
    console.log('using loadTranslations plugin', { language, namespace, callback });
    const loader = messageLoaders[language];
    if (!loader) {
      return callback(new Error('No message loader available for ' + language), null);
    }

    // TODO: namespace??
    const messages = await loader();
    callback(null, messages);
  },
};

export const t = i18n.t;

export function initializeI18n(locale: string) {
  const validLocale = VALID_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;

  return i18n
    .use(loadTranslations)
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
      lng: validLocale,

      // We don't bundle any translations, we load them async
      partialBundledLanguages: true,
      resources: {},

      // If translations are empty strings (no translation), fall back to the default value in source code
      returnEmptyString: false,
    });
}

export function changeLanguage(locale: string) {
  console.info('changeLanguage:', locale);
  const validLocale = VALID_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  return i18n.changeLanguage(validLocale);
}
