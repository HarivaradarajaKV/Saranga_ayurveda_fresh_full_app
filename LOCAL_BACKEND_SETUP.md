# Local Backend Development Setup

## Overview
Flip a single flag inside `app/config/dev.ts` to choose whether the client talks to your local Node server or the deployed Vercel backend—no other code changes required.

## Configuration Changes Made

### 1. API Configuration (`app/config/api.ts`)
- `getBaseUrl()` now reads a simple toggle value and logs which backend is active
- WebSocket helpers reuse the same toggle, so both HTTP and WS stay in sync automatically

### 2. Development Configuration (`app/config/dev.ts`)
- Adds `const USE_LOCAL_BACKEND = false;` – set it to `true` whenever you want to hit your local server
- Retains automatic LAN-IP discovery for Expo Go sessions when using the local backend

## Backend Setup Instructions

### 1. Start Your Local Backend
Make sure your backend server is running on:
- **API Server**: `http://localhost:5001/api`
- **WebSocket Server**: `ws://localhost:5001`

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

1. Open `app/config/dev.ts`
2. Set `const USE_LOCAL_BACKEND = true;` to use your LAN/local backend (remember to start the server)
3. Set it back to `false` to hit the hosted Vercel backend (no local server needed)

## Troubleshooting

### Connection Issues
1. **Backend not running**: Start your backend server
2. **Wrong port**: Update the port values in `app/config/dev.ts` (`resolveLocalBaseUrls`)
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

