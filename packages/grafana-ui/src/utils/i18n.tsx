import i18next from 'i18next';
import React from 'react';
import { Trans as I18NextTrans, initReactI18next } from 'react-i18next';

// Creates a default, english i18next instance when running outside of grafana.
// we don't support changing the locale of grafana ui when outside of Grafana
function initI18n() {
  if (!i18next.options.lng) {
    console.log('initializing i18next in grafana-ui');
    i18next.use(initReactI18next).init({
      resources: {},
      returnEmptyString: false,
      lng: 'en-US',
    });
  }
}

export const Trans: typeof I18NextTrans = (props) => {
  initI18n();
  return <I18NextTrans {...props} />;
};

export const t = (id: string, defaultMessage: string) => {
  initI18n();
  return i18next.t(id, defaultMessage);
};
