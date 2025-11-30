/**
 * Profile Service - AsyncStorage tabanlı profil yönetimi
 * iOS HIG uyumlu profil sayfası için veri katmanı
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage Keys
const STORAGE_KEYS = {
  USER_PROFILE: '@profile_user',
  USER_STATS: '@profile_stats',
  SETTINGS_NOTIFICATIONS: '@profile_notifications',
  SETTINGS_APPEARANCE: '@profile_appearance',
  PREDICTION_HISTORY: '@profile_predictions',
};

// Default Values
const DEFAULT_PROFILE = {
  displayName: 'Kullanıcı',
  memberSince: new Date().toISOString().split('T')[0],
  lastActive: new Date().toISOString(),
};

const DEFAULT_STATS = {
  totalPredictions: 0,
  correctPredictions: 0,
  savedMatches: 0,
  favoriteTeamsCount: 0,
};

const DEFAULT_NOTIFICATIONS = {
  matchReminders: true,
  liveScoreAlerts: true,
  favoriteTeamNews: true,
};

const DEFAULT_APPEARANCE = {
  darkMode: true,
  language: 'tr',
  oddsFormat: 'decimal',
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE CRUD
// ═══════════════════════════════════════════════════════════════════════════════

export const getProfile = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return data ? JSON.parse(data) : DEFAULT_PROFILE;
  } catch (error) {
    return DEFAULT_PROFILE;
  }
};

export const saveProfile = async (profile) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    return true;
  } catch (error) {
    return false;
  }
};

export const updateProfile = async (updates) => {
  try {
    const current = await getProfile();
    const updated = { ...current, ...updates, lastActive: new Date().toISOString() };
    await saveProfile(updated);
    return updated;
  } catch (error) {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATS CRUD
// ═══════════════════════════════════════════════════════════════════════════════

export const getStats = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_STATS);
    return data ? JSON.parse(data) : DEFAULT_STATS;
  } catch (error) {
    return DEFAULT_STATS;
  }
};

export const saveStats = async (stats) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_STATS, JSON.stringify(stats));
    return true;
  } catch (error) {
    return false;
  }
};

export const incrementStat = async (statName, amount = 1) => {
  try {
    const current = await getStats();
    const updated = { ...current, [statName]: (current[statName] || 0) + amount };
    await saveStats(updated);
    return updated;
  } catch (error) {
    return null;
  }
};

// Başarı oranı hesapla
export const calculateWinRate = (stats) => {
  if (!stats || stats.totalPredictions === 0) return 0;
  return Math.round((stats.correctPredictions / stats.totalPredictions) * 100);
};

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

export const getNotificationSettings = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS_NOTIFICATIONS);
    return data ? JSON.parse(data) : DEFAULT_NOTIFICATIONS;
  } catch (error) {
    return DEFAULT_NOTIFICATIONS;
  }
};

export const saveNotificationSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS_NOTIFICATIONS, JSON.stringify(settings));
    return true;
  } catch (error) {
    return false;
  }
};

export const updateNotificationSetting = async (key, value) => {
  try {
    const current = await getNotificationSettings();
    const updated = { ...current, [key]: value };
    await saveNotificationSettings(updated);
    return updated;
  } catch (error) {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// APPEARANCE SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

export const getAppearanceSettings = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS_APPEARANCE);
    return data ? JSON.parse(data) : DEFAULT_APPEARANCE;
  } catch (error) {
    return DEFAULT_APPEARANCE;
  }
};

export const saveAppearanceSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS_APPEARANCE, JSON.stringify(settings));
    return true;
  } catch (error) {
    return false;
  }
};

export const updateAppearanceSetting = async (key, value) => {
  try {
    const current = await getAppearanceSettings();
    const updated = { ...current, [key]: value };
    await saveAppearanceSettings(updated);
    return updated;
  } catch (error) {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATA MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

// Tüm profil verilerini sıfırla
export const resetAllProfileData = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_PROFILE,
      STORAGE_KEYS.USER_STATS,
      STORAGE_KEYS.SETTINGS_NOTIFICATIONS,
      STORAGE_KEYS.SETTINGS_APPEARANCE,
      STORAGE_KEYS.PREDICTION_HISTORY,
    ]);
    return true;
  } catch (error) {
    return false;
  }
};

// Profil verilerini dışa aktar
export const exportProfileData = async () => {
  try {
    const [profile, stats, notifications, appearance] = await Promise.all([
      getProfile(),
      getStats(),
      getNotificationSettings(),
      getAppearanceSettings(),
    ]);

    return {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      data: {
        profile,
        stats,
        settings: {
          notifications,
          appearance,
        },
      },
    };
  } catch (error) {
    return null;
  }
};

// Cache boyutunu hesapla (yaklaşık)
export const calculateCacheSize = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    let totalSize = 0;

    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += value.length * 2; // UTF-16 encoding
      }
    }

    // Bytes to MB
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    return parseFloat(sizeInMB);
  } catch (error) {
    return 0;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Üyelik tarihini formatla
export const formatMemberSince = (dateString) => {
  if (!dateString) return 'Bilinmiyor';

  const date = new Date(dateString);
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

// Dil kodunu isme çevir
export const getLanguageName = (code) => {
  const languages = {
    tr: 'Türkçe',
    en: 'English',
  };
  return languages[code] || code;
};

// Oran formatını isme çevir
export const getOddsFormatName = (format) => {
  const formats = {
    decimal: 'Ondalık (1.50)',
    fractional: 'Kesirli (1/2)',
    american: 'Amerikan (-200)',
  };
  return formats[format] || format;
};

export default {
  getProfile,
  saveProfile,
  updateProfile,
  getStats,
  saveStats,
  incrementStat,
  calculateWinRate,
  getNotificationSettings,
  saveNotificationSettings,
  updateNotificationSetting,
  getAppearanceSettings,
  saveAppearanceSettings,
  updateAppearanceSetting,
  resetAllProfileData,
  exportProfileData,
  calculateCacheSize,
  formatMemberSince,
  getLanguageName,
  getOddsFormatName,
};
