# Local Backend Development Setup

## Overview
The app is now configured to connect to your local backend for development instead of the Vercel deployment.

## Configuration Changes Made

### 1. API Configuration (`app/config/api.ts`)
- Updated `getBaseUrl()` to use local backend in development mode
- Modified WebSocket connection to use local WebSocket server
- Added dynamic URL switching based on `__DEV__` flag

### 2. Development Configuration (`app/config/dev.ts`)
- Created centralized dev configuration
- Easy switching between local and production URLs
- Configurable API and WebSocket endpoints

## Backend Setup Instructions

### 1. Start Your Local Backend
Make sure your backend server is running on:
- **API Server**: `http://localhost:5000/api`
- **WebSocket Server**: `ws://localhost:5001` (optional)

### 2. Backend Requirements
Your local backend should have:
- CORS enabled for React Native/Expo
- All the same endpoints as the production API
- Health check endpoint at `/health`

### 3. Testing the Connection
Run the test script to verify connection:
```bash
node test-api-config.js
```

## Switching Between Environments

### Development Mode (Local Backend)
- Automatically enabled when `__DEV__` is true
- Uses `http://localhost:5000/api`
- WebSocket: `ws://localhost:5001`

### Production Mode (Vercel)
- Automatically enabled when `__DEV__` is false
- Uses `https://ayurveda-saranga-backend.vercel.app/api`
- WebSocket: `wss://ayurveda-saranga-backend.vercel.app/ws`

## Troubleshooting

### Connection Issues
1. **Backend not running**: Start your backend server
2. **Wrong port**: Update `DEV_CONFIG` in `app/config/dev.ts`
3. **CORS errors**: Ensure your backend allows requests from Expo
4. **Network issues**: Check if localhost is accessible

### Common Backend Ports
- Express.js: Usually port 3000 or 5000
- Node.js: Check your `package.json` scripts
- Custom: Update the port in `DEV_CONFIG.API_BASE_URL`

## Files Modified
- `app/config/api.ts` - Main API configuration
- `app/config/dev.ts` - Development configuration (new)
- `test-api-config.js` - Test script (new)

## Next Steps
1. Start your local backend server
2. Run `npx expo start --clear` to restart the app
3. Test the connection with the test script
4. Verify all API calls are working with local backend

