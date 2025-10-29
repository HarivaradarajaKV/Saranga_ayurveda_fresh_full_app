#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Expo SDK 54 Migration...\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: package.json not found. Please run this script from the project root.');
  process.exit(1);
}

// Read current package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

console.log('📦 Current Expo SDK version:', packageJson.dependencies.expo);

// Verify the migration was already done
if (packageJson.dependencies.expo === '~54.0.0') {
  console.log('✅ Expo SDK 54 migration already completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Run: npm install');
  console.log('2. Run: npx expo start --clear');
  console.log('3. Test your application thoroughly');
  console.log('\n📖 See EXPO_SDK_54_MIGRATION.md for detailed information');
  process.exit(0);
}

console.log('⚠️  Migration not detected. Please ensure you have updated package.json, app.json, and eas.json');
console.log('\n📋 Manual steps required:');
console.log('1. Update package.json with SDK 54 dependencies');
console.log('2. Update app.json with SDK 54 configuration');
console.log('3. Update eas.json with SDK 54 EAS CLI version');
console.log('4. Run: npm install');
console.log('5. Run: npx expo start --clear');
console.log('\n📖 See EXPO_SDK_54_MIGRATION.md for detailed information');

// Check if node_modules exists
if (fs.existsSync('node_modules')) {
  console.log('\n🧹 Cleaning existing node_modules...');
  try {
    execSync('rm -rf node_modules', { stdio: 'inherit' });
    console.log('✅ node_modules cleaned');
  } catch (error) {
    console.log('⚠️  Could not clean node_modules automatically. Please delete it manually.');
  }
}

// Check if package-lock.json exists
if (fs.existsSync('package-lock.json')) {
  console.log('🧹 Cleaning package-lock.json...');
  try {
    execSync('rm package-lock.json', { stdio: 'inherit' });
    console.log('✅ package-lock.json cleaned');
  } catch (error) {
    console.log('⚠️  Could not clean package-lock.json automatically. Please delete it manually.');
  }
}

console.log('\n🎉 Migration preparation complete!');
console.log('\n📋 Next steps:');
console.log('1. Run: npm install');
console.log('2. Run: npx expo start --clear');
console.log('3. Test your application thoroughly');
console.log('\n📖 See EXPO_SDK_54_MIGRATION.md for detailed information');

