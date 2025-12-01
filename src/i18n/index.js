/**
 * i18n - Internationalization Module
 * Cihaz diline göre otomatik dil seçimi
 */

import * as Localization from 'expo-localization';
import tr from './tr.json';
import en from './en.json';

// Çeviri sözlükleri
const translations = { tr, en };

// Cihaz dilini algıla
const getDeviceLanguage = () => {
  const locale = Localization.locale || 'tr';
  const langCode = locale.split(/[-_]/)[0].toLowerCase();
  return langCode === 'tr' ? 'tr' : 'en';
};

// Aktif dil
let currentLanguage = getDeviceLanguage();

/**
 * Çeviri fonksiyonu
 * @param {string} key - Çeviri anahtarı (örn: "home.title" veya "common.loading")
 * @param {object} params - Değişken parametreler (örn: { count: 5 })
 * @returns {string} Çevrilmiş metin
 */
export const t = (key, params = {}) => {
  const keys = key.split('.');
  let value = translations[currentLanguage];

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      value = undefined;
      break;
    }
  }

  // Anahtar bulunamazsa İngilizce'ye fallback
  if (value === undefined) {
    value = translations['en'];
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        value = key; // Son çare: anahtarı döndür
        break;
      }
    }
  }

  // String değilse key döndür
  if (typeof value !== 'string') {
    return key;
  }

  // Parametreleri değiştir ({{param}} formatı)
  Object.keys(params).forEach(param => {
    value = value.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
  });

  return value;
};

/**
 * Aktif dili al
 */
export const getLanguage = () => currentLanguage;

/**
 * Dili değiştir
 */
export const setLanguage = (lang) => {
  if (translations[lang]) {
    currentLanguage = lang;
  }
};

/**
 * Dil Türkçe mi?
 */
export const isTurkish = () => currentLanguage === 'tr';

/**
 * Dil İngilizce mi?
 */
export const isEnglish = () => currentLanguage === 'en';

export default { t, getLanguage, setLanguage, isTurkish, isEnglish };
