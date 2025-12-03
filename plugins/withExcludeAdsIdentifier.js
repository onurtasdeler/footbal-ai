// plugins/withExcludeAdsIdentifier.js
const { withProjectBuildGradle } = require("@expo/config-plugins");

/**
 * Config plugin to exclude play-services-ads-identifier from all dependencies
 * at the Gradle level, preventing it from being included via transitive dependencies.
 *
 * This provides an additional layer of protection against AD_ID being included
 * through libraries like RevenueCat or other dependencies.
 */
function withExcludeAdsIdentifier(config) {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    // Check if exclusion already exists to avoid duplicates
    if (contents.includes("play-services-ads-identifier")) {
      return config;
    }

    // The exclusion configuration to add
    const exclusionCode = `
    // AD_ID Exclusion - Remove play-services-ads-identifier from all dependencies
    // This prevents any transitive dependency from including AD_ID support
    configurations.all {
        exclude group: 'com.google.android.gms', module: 'play-services-ads-identifier'
    }`;

    // Find the allprojects block and add the exclusion inside it
    const allProjectsRegex = /(allprojects\s*\{)/;

    if (allProjectsRegex.test(contents)) {
      config.modResults.contents = contents.replace(
        allProjectsRegex,
        `$1${exclusionCode}`
      );
    } else {
      // Fallback: add allprojects block before the last closing brace
      // This handles cases where allprojects doesn't exist
      const lastBraceIndex = contents.lastIndexOf("}");
      if (lastBraceIndex !== -1) {
        config.modResults.contents =
          contents.slice(0, lastBraceIndex) +
          `\nallprojects {${exclusionCode}\n}\n` +
          contents.slice(lastBraceIndex);
      }
    }

    return config;
  });
}

module.exports = withExcludeAdsIdentifier;
