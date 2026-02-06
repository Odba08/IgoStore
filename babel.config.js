module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@core': './src/core',
            '@entities': './src/core/entities',
            '@infrastructure': './src/infrastructure',
            '@services': './src/infrastructure/services',
            '@presentation': './src/presentation',
            '@components': './src/presentation/components',
            '@hooks': './src/presentation/hooks',
            '@store': './src/presentation/store',
          },
        },
      ],
    ],
  };
};