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
    const manifest = config.modResults.manifest;
    const mainApplication = manifest.application[0];

    // Add tools namespace if not present
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Meta-data array yoksa oluştur
    if (!mainApplication['meta-data']) {
      mainApplication['meta-data'] = [];
    }

    // Firebase Analytics Ad ID collection devre dışı bırak
    // tools:replace kullanarak Firebase Analytics'in değerini override et
    const adIdDisabled = {
      $: {
        'android:name': 'google_analytics_adid_collection_enabled',
        'android:value': 'false',
        'tools:replace': 'android:value',
      },
    };

    // Google Analytics default collection devre dışı bırak
    const analyticsDefault = {
      $: {
        'android:name': 'google_analytics_default_allow_ad_personalization_signals',
        'android:value': 'false',
        'tools:replace': 'android:value',
      },
    };

    // Mevcut meta-data'ları güncelle veya ekle
    const existingAdIdIndex = mainApplication['meta-data'].findIndex(
      (item) => item.$['android:name'] === 'google_analytics_adid_collection_enabled'
    );
    if (existingAdIdIndex !== -1) {
      mainApplication['meta-data'][existingAdIdIndex] = adIdDisabled;
    } else {
      mainApplication['meta-data'].push(adIdDisabled);
    }

    const existingAnalyticsIndex = mainApplication['meta-data'].findIndex(
      (item) => item.$['android:name'] === 'google_analytics_default_allow_ad_personalization_signals'
    );
    if (existingAnalyticsIndex !== -1) {
      mainApplication['meta-data'][existingAnalyticsIndex] = analyticsDefault;
    } else {
      mainApplication['meta-data'].push(analyticsDefault);
    }

    return config;
  });
};

module.exports = withDisableAdId;
