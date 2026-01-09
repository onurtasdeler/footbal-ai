/**
 * Date Utilities for Football App
 * Tekrarlayan tarih formatı fonksiyonlarını birleştirir
 */

import { t } from '../i18n';

// Gün ve ay anahtarları (çeviri için)
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Offset'e göre tarih hesapla (bugünden gün farkı)
 * @param {number} offset - Gün offset'i (0 = bugün, 1 = yarın, -1 = dün)
 * @returns {Date} Hesaplanan tarih
 */
export const getDateFromOffset = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date;
};

/**
 * ISO formatında tarih string'i döner (YYYY-MM-DD)
 * @param {number} offset - Gün offset'i
 * @returns {string} ISO tarih string'i
 */
export const getDateString = (offset = 0) => {
  return getDateFromOffset(offset).toISOString().split('T')[0];
};

/**
 * Kısa gün adı döner (Pzt, Sal, Bugün, Dün, Yarın)
 * @param {number} offset - Gün offset'i
 * @returns {string} Kısa gün adı
 */
export const formatDayShort = (offset) => {
  if (offset === 0) return t('home.today');
  if (offset === -1) return t('home.yesterday');
  if (offset === 1) return t('home.tomorrow');

  const date = getDateFromOffset(offset);
  return t(`home.days.${DAY_KEYS[date.getDay()]}`);
};

/**
 * Sadece gün numarası döner
 * @param {number} offset - Gün offset'i
 * @returns {string} Gün numarası
 */
export const formatDateNum = (offset) => {
  return `${getDateFromOffset(offset).getDate()}`;
};

/**
 * Tarih etiketi döner (Dün, Bugün, Yarın veya gün/ay)
 * @param {number} offset - Gün offset'i
 * @returns {string} Tarih etiketi
 */
export const formatDateLabel = (offset) => {
  if (offset === -1) return t('home.yesterday');
  if (offset === 0) return t('home.today');
  if (offset === 1) return t('home.tomorrow');

  const date = getDateFromOffset(offset);
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

/**
 * Uzun tarih gösterimi döner (25 Aralık, Pazartesi)
 * @param {number} offset - Gün offset'i
 * @returns {string} Uzun tarih string'i
 */
export const formatDateDisplay = (offset) => {
  const date = getDateFromOffset(offset);
  const dayKey = DAY_KEYS[date.getDay()];
  const monthKey = MONTH_KEYS[date.getMonth()];
  return `${date.getDate()} ${t(`home.months.${monthKey}`)}, ${t(`home.daysLong.${dayKey}`)}`;
};

/**
 * Kısa tarih gösterimi döner (25 Ara)
 * @param {number} offset - Gün offset'i
 * @returns {string} Kısa tarih string'i
 */
export const formatShortDate = (offset) => {
  const date = getDateFromOffset(offset);
  const monthKey = MONTH_KEYS[date.getMonth()];
  return `${date.getDate()} ${t(`home.months.${monthKey}`)}`;
};

/**
 * Tüm tarih formatlarını tek seferde döner (performans için)
 * @param {number} offset - Gün offset'i
 * @returns {object} Tüm tarih formatları
 */
export const getDateFormats = (offset) => {
  const date = getDateFromOffset(offset);
  const dayKey = DAY_KEYS[date.getDay()];
  const monthKey = MONTH_KEYS[date.getMonth()];
  const dayNum = date.getDate();
  const monthNum = date.getMonth() + 1;

  // Özel günler için kontrol
  let dayShort;
  if (offset === 0) dayShort = t('home.today');
  else if (offset === -1) dayShort = t('home.yesterday');
  else if (offset === 1) dayShort = t('home.tomorrow');
  else dayShort = t(`home.days.${dayKey}`);

  let dateLabel;
  if (offset === -1) dateLabel = t('home.yesterday');
  else if (offset === 0) dateLabel = t('home.today');
  else if (offset === 1) dateLabel = t('home.tomorrow');
  else dateLabel = `${dayNum}/${monthNum}`;

  return {
    dayShort,
    dateNum: `${dayNum}`,
    dateLabel,
    dateDisplay: `${dayNum} ${t(`home.months.${monthKey}`)}, ${t(`home.daysLong.${dayKey}`)}`,
    shortDate: `${dayNum} ${t(`home.months.${monthKey}`)}`,
    isoString: date.toISOString().split('T')[0],
  };
};

export default {
  getDateFromOffset,
  getDateString,
  formatDayShort,
  formatDateNum,
  formatDateLabel,
  formatDateDisplay,
  formatShortDate,
  getDateFormats,
};
