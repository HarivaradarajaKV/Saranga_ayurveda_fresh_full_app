// Development Configuration
import Constants from 'expo-constants';

type BackendTargetName = 'local' | 'vercel';

interface BackendInfo {
    name: BackendTargetName;
    api: string;
    ws: string;
}

// Flip this flag to point the app at your local backend.
// true  => use LAN IP / localhost backend
// false => use hosted Vercel backend
const USE_LOCAL_BACKEND = false;

const LOCAL_FALLBACK = {
    api: 'http://localhost:5001/api',
    ws: 'ws://localhost:5001',
};

const VERCEL_TARGET = {
    api: 'https://ayurveda-saranga-backend.vercel.app/api',
    ws: 'wss://ayurveda-saranga-backend.vercel.app/ws',
};

const resolveLocalBaseUrls = () => {
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
        return { ...LOCAL_FALLBACK };
    }
};

const getActiveBackend = (): BackendInfo => {
    if (USE_LOCAL_BACKEND) {
        const urls = resolveLocalBaseUrls();
        return {
            name: 'local',
            api: urls.api,
            ws: urls.ws,
        };
    }

    return {
        name: 'vercel',
        api: VERCEL_TARGET.api,
        ws: VERCEL_TARGET.ws,
    };
};

export const DEV_CONFIG = {
    USE_LOCAL_BACKEND,

    // Local backend configuration - default template; actual IP resolved dynamically
    LOCAL_API_BASE_URL: LOCAL_FALLBACK.api,
    LOCAL_WS_URL: LOCAL_FALLBACK.ws,
    
    // Production configuration (fallback)
    PROD_API_BASE_URL: VERCEL_TARGET.api,
    PROD_WS_URL: VERCEL_TARGET.ws,
    
    // Development mode flag
    IS_DEV: __DEV__,
    
    // Resolve LAN IP from Expo to avoid hard-coded addresses
    resolveLocalBaseUrls,

    getActiveBackend,
    
    // Get the appropriate URLs based on toggle
    getApiUrl: () => {
        const backend = getActiveBackend();
        console.log('[DEV_CONFIG] Using API URL:', backend.api, `(target: ${backend.name})`);
        return backend.api;
    },

    getWsUrl: () => {
        const backend = getActiveBackend();
        console.log('[DEV_CONFIG] Using WS URL:', backend.ws, `(target: ${backend.name})`);
        return backend.ws;
    },
};

