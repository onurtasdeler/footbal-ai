// plugins/withFirebaseModularHeaders.js
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Config plugin to ensure Firebase pods build correctly with New Architecture.
 *
 * This enables modular headers for Firebase's Objective-C dependencies
 * so that Swift pods (FirebaseCoreInternal, FirebaseCrashlytics, etc.)
 * can properly integrate with them.
 */
function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      let podfileContent = fs.readFileSync(podfilePath, "utf-8");

      // Check if our fix is already applied
      if (podfileContent.includes("FIREBASE_MODULAR_HEADERS_FIX")) {
        return config;
      }

      // Global modular headers declaration for Firebase dependencies
      const modularHeadersFix = `
# FIREBASE_MODULAR_HEADERS_FIX - Enable modular headers for Firebase Swift pod dependencies
# This is required because Firebase Swift pods depend on ObjC pods that need module maps
use_modular_headers!

`;

      // Post-install hook to ensure Firebase compatibility
      const postInstallFix = `
    # FIREBASE_MODULAR_HEADERS_FIX - Ensure Firebase pods build correctly
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') ||
         target.name.include?('Firebase') ||
         target.name.include?('GoogleUtilities') ||
         target.name.include?('GoogleDataTransport') ||
         target.name == 'nanopb'
        target.build_configurations.each do |config|
          config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'] = 'NO'
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end
    end`;

      // Insert modular headers declarations before the first target definition
      const targetRegex = /^target\s+['"].*['"]\s+do/m;
      if (targetRegex.test(podfileContent)) {
        podfileContent = podfileContent.replace(
          targetRegex,
          (match) => `${modularHeadersFix}${match}`
        );
      }

      // Add post_install modifications
      const postInstallRegex = /post_install do \|installer\|/;
      if (postInstallRegex.test(podfileContent)) {
        podfileContent = podfileContent.replace(
          postInstallRegex,
          `post_install do |installer|${postInstallFix}`
        );
      }

      fs.writeFileSync(podfilePath, podfileContent, "utf-8");

      return config;
    },
  ]);
}

module.exports = withFirebaseModularHeaders;
