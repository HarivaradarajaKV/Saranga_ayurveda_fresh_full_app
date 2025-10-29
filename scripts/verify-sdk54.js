#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Expo SDK 54 Migration...\n');

// Check package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

console.log('📦 Package.json checks:');
console.log(`  Expo SDK: ${packageJson.dependencies.expo}`);
console.log(`  React: ${packageJson.dependencies.react}`);
console.log(`  React Native: ${packageJson.dependencies['react-native']}`);
console.log(`  React Native Web: ${packageJson.dependencies['react-native-web']}`);

// Check app.json
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));

console.log('\n📱 App.json checks:');
console.log(`  SDK Version: ${appJson.expo.sdkVersion}`);
console.log(`  iOS Bundle ID: ${appJson.expo.ios?.bundleIdentifier || 'Not set'}`);
console.log(`  Android Package: ${appJson.expo.android?.package}`);

// Check eas.json
const easJson = JSON.parse(fs.readFileSync('eas.json', 'utf8'));

console.log('\n🏗️  EAS.json checks:');
console.log(`  EAS CLI Version: ${easJson.cli.version}`);
console.log(`  Node Version: ${easJson.build.production.node}`);

// Verification results
const checks = {
  expoVersion: packageJson.dependencies.expo === '~54.0.0',
  reactVersion: packageJson.dependencies.react === '18.3.1',
  reactNativeVersion: packageJson.dependencies['react-native'] === '0.76.3',
  sdkVersion: appJson.expo.sdkVersion === '54.0.0',
  easCliVersion: easJson.cli.version === '>= 7.8.6',
  nodeVersion: easJson.build.production.node === '20.18.0'
};

console.log('\n✅ Verification Results:');
Object.entries(checks).forEach(([key, passed]) => {
  console.log(`  ${key}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
});

const allPassed = Object.values(checks).every(check => check);

if (allPassed) {
  console.log('\n🎉 All checks passed! SDK 54 migration is complete.');
  console.log('\n📋 Next steps:');
  console.log('1. Run: npm install');
  console.log('2. Run: npx expo start --clear');
  console.log('3. Test your application thoroughly');
} else {
  console.log('\n⚠️  Some checks failed. Please review the migration.');
  console.log('📖 See EXPO_SDK_54_MIGRATION.md for detailed information');
}

process.exit(allPassed ? 0 : 1);

