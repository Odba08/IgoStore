const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Fuerza newArchEnabled=false en android/gradle.properties
 * para asegurar compatibilidad total con react-native-maps y lottie.
 */
module.exports = function withDisableNewArch(config) {
  return withGradleProperties(config, (gradleConfig) => {
    gradleConfig.modResults = gradleConfig.modResults.map((item) => {
      if (item.type === 'property' && item.key === 'newArchEnabled') {
        return { ...item, value: 'false' };
      }
      return item;
    });
    return gradleConfig;
  });
};
