// Development Configuration
import Constants from 'expo-constants';

export const DEV_CONFIG = {
    // Local backend configuration - default template; actual IP resolved dynamically
    LOCAL_API_BASE_URL: 'http://localhost:5001/api',
    LOCAL_WS_URL: 'ws://localhost:5001',
    
    // Production configuration (fallback)
    PROD_API_BASE_URL: 'https://ayurveda-saranga-backend.vercel.app/api',
    PROD_WS_URL: 'wss://ayurveda-saranga-backend.vercel.app/ws',
    
    // Development mode flag
    IS_DEV: __DEV__,
    
    // Resolve LAN IP from Expo to avoid hard-coded addresses
    resolveLocalBaseUrls: () => {
        try {
            // Try Expo manifest2 first
            // @ts-ignore - manifest2 may not exist in all environments
            const host = Constants.manifest2?.extra?.expoGo?.debuggerHost
                // @ts-ignore
                || Constants.manifest2?.hostUri
                // @ts-ignore - older Expo
                || Constants.manifest?.hostUri
                // @ts-ignore
                || (Constants.expoConfig as any)?.hostUri;
            const ip = typeof host === 'string' ? host.split(':')[0] : 'localhost';
            const api = `http://${ip}:5001/api`;
            const ws = `ws://${ip}:5001`;
            return { api, ws };
        } catch {
            return { api: DEV_CONFIG.LOCAL_API_BASE_URL, ws: DEV_CONFIG.LOCAL_WS_URL };
        }
    },
    
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
            const { api } = DEV_CONFIG.resolveLocalBaseUrls();
            console.log('[DEV_CONFIG] Using explicit LOCAL API override:', api);
            return api;
        }
        // Default to LOCAL API for development
        {
            const { api } = DEV_CONFIG.resolveLocalBaseUrls();
            console.log('[DEV_CONFIG] Using default LOCAL API:', api);
            return api;
        }
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
            const { ws } = DEV_CONFIG.resolveLocalBaseUrls();
            console.log('[DEV_CONFIG] Using explicit LOCAL WS override:', ws);
            return ws;
        }
        // Default to LOCAL WS for development
        {
            const { ws } = DEV_CONFIG.resolveLocalBaseUrls();
            console.log('[DEV_CONFIG] Using default LOCAL WS:', ws);
            return ws;
        }
    },
};

