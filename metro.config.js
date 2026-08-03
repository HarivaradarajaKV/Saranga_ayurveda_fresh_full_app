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

// Ignore temporary dot-directories inside node_modules (e.g., .expo-image-*)
const existingBlockList = config.resolver.blockList;
const blockListArray = Array.isArray(existingBlockList)
  ? existingBlockList
  : existingBlockList
  ? [existingBlockList]
  : [];
config.resolver.blockList = [/node_modules[\/\\]\..*/, ...blockListArray];

// Disable Watchman on Windows to prevent "Failed to start watch mode" timeout errors
config.resolver.useWatchman = false;

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

