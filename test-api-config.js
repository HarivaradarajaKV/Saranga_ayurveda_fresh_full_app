// Test script to verify API configuration
import { getBaseUrl, testApiReachable } from './app/config/api';
import { DEV_CONFIG } from './app/config/dev';

console.log('=== API Configuration Test ===');
console.log('Development Mode:', DEV_CONFIG.IS_DEV);
console.log('API URL:', DEV_CONFIG.getApiUrl());
console.log('WebSocket URL:', DEV_CONFIG.getWsUrl());
console.log('Base URL from getBaseUrl():', getBaseUrl());

// Test API reachability
testApiReachable().then((isReachable) => {
    console.log('API Reachable:', isReachable);
    if (!isReachable) {
        console.log('⚠️  Make sure your local backend is running on port 5000');
        console.log('   Start your backend with: npm start or node server.js');
    } else {
        console.log('✅ API connection successful!');
    }
}).catch((error) => {
    console.error('❌ API test failed:', error);
});

