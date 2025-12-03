// plugins/withDisableAdId.js
const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Config plugin to remove AD_ID permission from Android manifest
 * using the tools:node="remove" directive for proper manifest merger behavior.
 *
 * This is necessary because blockedPermissions alone may not work with EAS Build.
 * The tools:node="remove" directive instructs Android's manifest merger to
 * remove these permissions even if they're added by dependencies.
 */
function withDisableAdId(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // Ensure the tools namespace is defined on the manifest element
    // This is REQUIRED for tools:node to work
    androidManifest.$ = {
      ...androidManifest.$,
      "xmlns:tools": "http://schemas.android.com/tools",
    };

    // Initialize uses-permission array if it doesn't exist
    if (!androidManifest["uses-permission"]) {
      androidManifest["uses-permission"] = [];
    }

    // Get list of existing permission names to avoid duplicates
    const existingPermissions = androidManifest["uses-permission"].map(
      (perm) => perm.$?.["android:name"]
    ).filter(Boolean);

    // Permissions to remove with tools:node="remove"
    const permissionsToRemove = [
      "com.google.android.gms.permission.AD_ID",
      "android.permission.ACCESS_ADSERVICES_AD_ID",
      "android.permission.ACCESS_ADSERVICES_ATTRIBUTION",
    ];

    // Add each permission with tools:node="remove" if not already present
    permissionsToRemove.forEach((permName) => {
      const existingIndex = androidManifest["uses-permission"].findIndex(
        (perm) => perm.$?.["android:name"] === permName
      );

      if (existingIndex === -1) {
        // Permission doesn't exist, add it with remove directive
        androidManifest["uses-permission"].push({
          $: {
            "android:name": permName,
            "tools:node": "remove",
          },
        });
      } else {
        // Permission exists, ensure it has tools:node="remove"
        androidManifest["uses-permission"][existingIndex].$["tools:node"] = "remove";
      }
    });

    return config;
  });
}

module.exports = withDisableAdId;
