const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to fix Firebase modular header issues with New Architecture
 * Modifies Podfile to add post_install hook that sets CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES
 */
const withFirebaseModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');

        // Check if our modification already exists
        if (!podfileContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
          // Find the post_install block or create one
          const postInstallHook = `
  # Fix Firebase modular headers for New Architecture
  post_install do |installer|
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end

    # Call the existing react native post install if it exists
    react_native_post_install(installer) if defined?(react_native_post_install)
  end
`;

          // Check if there's already a post_install block
          if (podfileContent.includes('post_install do |installer|')) {
            // Inject our setting into existing post_install
            podfileContent = podfileContent.replace(
              /post_install do \|installer\|/,
              `post_install do |installer|
    # Fix Firebase modular headers for New Architecture
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`
            );
          } else {
            // Add new post_install block at the end (before the last 'end' of the target block)
            // Find the last 'end' that closes the main target block
            const endMatch = podfileContent.lastIndexOf('\nend');
            if (endMatch !== -1) {
              podfileContent = podfileContent.slice(0, endMatch) + postInstallHook + podfileContent.slice(endMatch);
            } else {
              // Fallback: append at the end
              podfileContent += postInstallHook;
            }
          }

          fs.writeFileSync(podfilePath, podfileContent);
        }
      }

      return config;
    },
  ]);
};

module.exports = withFirebaseModularHeaders;
