// Development Configuration
import Constants from 'expo-constants';

export const DEV_CONFIG = {
    // Local backend configuration - using your specific IP
    LOCAL_API_BASE_URL: 'http://192.168.31.143:5001/api',
    LOCAL_WS_URL: 'ws://192.168.31.143:5001',
    
    // Production configuration (fallback)
    PROD_API_BASE_URL: 'https://ayurveda-saranga-backend.vercel.app/api',
    PROD_WS_URL: 'wss://ayurveda-saranga-backend.vercel.app/ws',
    
    // Development mode flag
    IS_DEV: __DEV__,
    
    // Get the appropriate URLs based on environment
    getApiUrl: () => {
        // Prefer public env (Expo) or extra if provided
        // @ts-ignore - Expo injects public env at build/runtime
        const envUrl = (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ||
            (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_API_BASE_URL ||
            (Constants.manifest?.extra as any)?.EXPO_PUBLIC_API_BASE_URL;
        if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
            console.log('[DEV_CONFIG] Using API from env/extra:', envUrl);
            return envUrl.trim();
        }
        // Allow explicit local override only when EXPO_PUBLIC_USE_LOCAL === '1'
        // @ts-ignore
        const useLocal = (process.env.EXPO_PUBLIC_USE_LOCAL as string | undefined) ||
            (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_USE_LOCAL ||
            (Constants.manifest?.extra as any)?.EXPO_PUBLIC_USE_LOCAL;
        if (String(useLocal).trim() === '1') {
            console.log('[DEV_CONFIG] Using explicit LOCAL API override:', DEV_CONFIG.LOCAL_API_BASE_URL);
            return DEV_CONFIG.LOCAL_API_BASE_URL;
        }
        // Default to PROD API (Vercel) to ensure production connectivity during development as well
        console.log('[DEV_CONFIG] Using default PROD API:', DEV_CONFIG.PROD_API_BASE_URL);
        return DEV_CONFIG.PROD_API_BASE_URL;
    },
    getWsUrl: () => {
        // Prefer public env or extra for WS if provided
        // @ts-ignore - Expo injects public env at build/runtime
        const envWs = (process.env.EXPO_PUBLIC_WS_URL as string | undefined) ||
            (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_WS_URL ||
            (Constants.manifest?.extra as any)?.EXPO_PUBLIC_WS_URL;
        if (envWs && typeof envWs === 'string' && envWs.trim().length > 0) {
            console.log('[DEV_CONFIG] Using WS from env/extra:', envWs);
            return envWs.trim();
        }
        // Allow explicit local override only when EXPO_PUBLIC_USE_LOCAL === '1'
        // @ts-ignore
        const useLocal = (process.env.EXPO_PUBLIC_USE_LOCAL as string | undefined) ||
            (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_USE_LOCAL ||
            (Constants.manifest?.extra as any)?.EXPO_PUBLIC_USE_LOCAL;
        if (String(useLocal).trim() === '1') {
            console.log('[DEV_CONFIG] Using explicit LOCAL WS override:', DEV_CONFIG.LOCAL_WS_URL);
            return DEV_CONFIG.LOCAL_WS_URL;
        }
        console.log('[DEV_CONFIG] Using default PROD WS:', DEV_CONFIG.PROD_WS_URL);
        return DEV_CONFIG.PROD_WS_URL;
    },
};

