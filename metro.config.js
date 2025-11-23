const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional file extensions
config.resolver.assetExts.push(
  // Add any additional asset extensions your app uses
  'db',
  'mp3',
  'ttf',
  'obj',
  'png',
  'jpg'
);

// Increase max workers for faster bundling
config.maxWorkers = 2;

// Optimize cache for better performance
config.cacheStores = [
  ...(config.cacheStores || []),
];

// Increase timeout settings
config.server = {
  ...config.server,
  port: 8081,
};

module.exports = config;

