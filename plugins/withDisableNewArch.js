const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Fuerza newArchEnabled=false en android/gradle.properties
 * para asegurar compatibilidad total con react-native-maps y lottie.
 */
module.exports = function withDisableNewArch(config) {
  return withGradleProperties(config, (gradleConfig) => {
    let found = false;
    gradleConfig.modResults = gradleConfig.modResults.map((item) => {
      if (item.type === 'property' && item.key === 'newArchEnabled') {
        found = true;
        return { ...item, value: 'false' };
      }
      return item;
    });

    if (!found) {
      gradleConfig.modResults.push({
        type: 'property',
        key: 'newArchEnabled',
        value: 'false',
      });
    }

    return gradleConfig;
  });
};
