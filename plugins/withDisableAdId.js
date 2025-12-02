/**
 * Expo Config Plugin - Disable Advertising ID Collection
 *
 * Bu plugin, Android 13+ için reklam kimliği (Advertising ID)
 * kullanımını tamamen devre dışı bırakır.
 *
 * AndroidManifest.xml'e meta-data ekler:
 * - google_analytics_adid_collection_enabled = false
 */

const { withAndroidManifest } = require('@expo/config-plugins');

const withDisableAdId = (config) => {
  return withAndroidManifest(config, async (config) => {
    const mainApplication = config.modResults.manifest.application[0];

    // Meta-data array yoksa oluştur
    if (!mainApplication['meta-data']) {
      mainApplication['meta-data'] = [];
    }

    // Firebase Analytics Ad ID collection devre dışı bırak
    const adIdDisabled = {
      $: {
        'android:name': 'google_analytics_adid_collection_enabled',
        'android:value': 'false',
      },
    };

    // Google Analytics default collection devre dışı bırak
    const analyticsDefault = {
      $: {
        'android:name': 'google_analytics_default_allow_ad_personalization_signals',
        'android:value': 'false',
      },
    };

    // Firebase default collection devre dışı bırak
    const firebaseDefault = {
      $: {
        'android:name': 'firebase_analytics_collection_deactivated',
        'android:value': 'false', // false = collection aktif ama ad ID olmadan
      },
    };

    // Mevcut meta-data'ları kontrol et, yoksa ekle
    const existingAdId = mainApplication['meta-data'].find(
      (item) => item.$['android:name'] === 'google_analytics_adid_collection_enabled'
    );
    if (!existingAdId) {
      mainApplication['meta-data'].push(adIdDisabled);
    }

    const existingAnalytics = mainApplication['meta-data'].find(
      (item) => item.$['android:name'] === 'google_analytics_default_allow_ad_personalization_signals'
    );
    if (!existingAnalytics) {
      mainApplication['meta-data'].push(analyticsDefault);
    }

    return config;
  });
};

module.exports = withDisableAdId;
