import axios, { AxiosError, AxiosResponse, AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_BASE_URL, API_CONFIG, getBaseUrl, checkNetworkConnection } from '../config/api';
import { ApiService, ApiResponse, ProductData, AuthResponse, GoogleAuthResponse, Category, Address, UserProfile } from '../types/api';

// Gate verbose logs to avoid memory pressure in dev
const DEBUG_API = __DEV__ && String((Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_DEBUG_API || (process.env as any)?.EXPO_PUBLIC_DEBUG_API || '').trim() === '1';

const MAX_RETRIES = 2;
const RETRY_DELAY = 500;
const CONNECTION_TIMEOUT = 5000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isNetworkError = (error: unknown): error is AxiosError => {
    return axios.isAxiosError(error) && !error.response;
};

const isAuthEndpoint = (url: string | undefined): boolean => {
    if (!url) return false;
    return url.includes('/auth/') || 
           url.includes('/login') || 
           url.includes('/register') || 
           url.includes('/health');
};

const isPublicEndpoint = (url: string | undefined): boolean => {
    const publicPaths = [
        '/auth/login',
        '/auth/register',
        '/products',
        '/categories',
        '/brand-reviews',
        '/health'
    ];
    return url ? publicPaths.some(path => url.includes(path)) : false;
};

const retryRequest = async <T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    maxRetries = 3,
    retryDelay = 1000
): Promise<AxiosResponse<T>> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await requestFn();
        } catch (error) {
            lastError = error as Error;
            if (!isNetworkError(error)) {
                throw error;
            }
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }
    
    throw lastError;
};

export class Api implements ApiService {
    ENDPOINTS = API_CONFIG.ENDPOINTS;
    private retryCount = 0;
    private client: AxiosInstance;
    private userId: string | null = null;
    // Lightweight dedup + short-lived caches to avoid request storms
    private adminProductsCache: { data: ProductData[]; ts: number } | null = null;
    private adminProductsInFlight: Promise<ApiResponse<ProductData[]>> | null = null;
    private couponsCache: { data: any[]; ts: number } | null = null;
    private couponsInFlight: Promise<ApiResponse<any[]>> | null = null;
    private combosCache: { data: any[]; ts: number } | null = null;
    private combosInFlight: Promise<ApiResponse<any[]>> | null = null;

    constructor() {
        const baseURL = getBaseUrl();
        if (DEBUG_API) {
            try {
                console.log('[API Service] Initializing with base URL:', String(baseURL).slice(0, 120));
            } catch {}
        }
        
        this.client = axios.create({
            baseURL,
            timeout: API_CONFIG.TIMEOUT,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        // Initialize auth token
        this.initializeAuthToken();

        // Log all requests for debugging
        this.client.interceptors.request.use(
            async (config) => {
                try {
                    // Skip network check for now since it's causing issues
                    // const isConnected = await checkNetworkConnection();
                    // if (!isConnected) {
                    //     throw new Error('Cannot connect to server. Please check your network connection.');
                    // }

                    // Log request details only when debug flag is enabled
                    if (DEBUG_API) {
                        console.debug('[API] Request:', {
                            method: config.method,
                            url: config.url,
                            baseURL: config.baseURL
                        });
                    }

                    return config;
                } catch (error) {
                    if (DEBUG_API) {
                        console.debug('[API] Request preparation failed:', error);
                    }
                    return Promise.reject(error);
                }
            },
            (error) => {
                if (DEBUG_API) {
                    console.debug('[API] Request Error:', error);
                }
                return Promise.reject(error);
            }
        );

        // Log all responses for debugging (with preview to avoid memory spikes)
        this.client.interceptors.response.use(
            (response) => {
                if (DEBUG_API) {
                    let dataPreview = '[unserializable]';
                    try {
                        const str = typeof response.data === 'string'
                            ? response.data
                            : JSON.stringify(response.data);
                        dataPreview = str.length > 200 ? `${str.slice(0, 200)}… (+${str.length - 200} chars)` : str;
                    } catch {}
                    console.debug('[API] Response:', {
                        status: response.status,
                        statusText: response.statusText,
                        dataPreview,
                    });
                }
                return response;
            },
            async (error) => {
                // Only log in development
                if (DEBUG_API) {
                    let responsePreview = '[no response]';
                    try {
                        if (error.response?.data) {
                            const str = typeof error.response.data === 'string'
                                ? error.response.data
                                : JSON.stringify(error.response.data);
                            responsePreview = str.length > 200 ? `${str.slice(0, 200)}… (+${str.length - 200} chars)` : str;
                        }
                    } catch {}
                    const cfg = {
                        url: error.config?.url,
                        method: error.config?.method,
                        baseURL: error.config?.baseURL,
                    };
                    console.debug('[API] Response Error:', {
                        message: error.message,
                        code: error.code,
                        status: error.response?.status,
                        responsePreview,
                        config: cfg
                    });
                }

                // Handle 401 Unauthorized errors silently
                if (error.response?.status === 401) {
                    try {
                        await AsyncStorage.multiRemove(['auth_token', 'user_id', 'user_name']);
                        this.userId = null;
                        
                        if (error.response?.data?.details?.error === "Invalid token") {
                            return { data: null };
                        }
                    } catch (clearError) {
                        if (DEBUG_API) {
                            console.debug('[API] Error clearing auth data:', clearError);
                        }
                    }
                }

                return Promise.reject(error);
            }
        );

        // Initialize user ID from storage
        this.initializeUserId();

        // Skip initial connection test for now
        // this.testConnection()
        //     .then((success) => {
        //         if (!success) {
        //             console.log('Initial connection failed, retrying...');
        //             this.retryConnection(API_CONFIG.MAX_RETRIES);
        //         } else {
        //             console.log('Successfully connected to API');
        //         }
        //     })
        //     .catch((error) => {
        //         console.error('Connection error:', error);
        //         this.retryConnection(API_CONFIG.MAX_RETRIES);
        //     });
    }

    private async initializeAuthToken() {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (token) {
                this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.debug('Error initializing auth token:', error);
            }
        }
    }

    private async retryConnection(attempts: number) {
        if (attempts <= 0) return;
        
        if (process.env.NODE_ENV === 'development') {
            console.debug(`Retrying connection... (${attempts} attempts remaining)`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
            const success = await this.testConnection();
            if (!success && attempts > 1) {
                this.retryConnection(attempts - 1);
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.debug('Connection error:', error);
            }
            if (attempts > 1) {
                this.retryConnection(attempts - 1);
            }
        }
    }

    private async retryRequest(config: any, retries = 1): Promise<any> {
        try {
            const response = await this.client.request(config);
            return response;
        } catch (error: unknown) {
            if (retries > 0 && error instanceof Error && 
                ((error as any).code === 'ECONNABORTED' || !(error as any).response)) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return this.retryRequest(config, retries - 1);
            }
            throw error;
        }
    }

    async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
        try {
            const headers = await this.getHeaders();
            const config = { headers };

            if (DEBUG_API) {
                try {
                    console.log('[API] GET:', {
                        baseURL: String(this.client.defaults.baseURL).slice(0, 120),
                        url: endpoint,
                    });
                } catch {}
            }

            // Special handling for brand-reviews endpoint
            if (endpoint === this.ENDPOINTS.BRAND_REVIEWS) {
                try {
                    const response = await this.client.get<T>(endpoint, config);
                    return { data: response.data };
                } catch (error) {
                    if (DEBUG_API) console.log('Brand reviews endpoint error');
                    // Return empty array for brand-reviews endpoint on error
                    return { data: [] as unknown as T };
                }
            }

            // Normal request flow for other endpoints
            const response = await retryRequest(
                () => this.client.get<T>(endpoint, config),
                API_CONFIG.MAX_RETRIES,
                API_CONFIG.RETRY_DELAY
            );

            if (DEBUG_API) {
                try {
                    const preview = JSON.stringify(response.data);
                    console.log('[API] GET OK:', {
                        status: response.status,
                        dataPreview: preview.length > 400 ? `${preview.slice(0, 400)}… (+${preview.length - 400} chars)` : preview
                    });
                } catch {}
            }

            return { data: response.data };
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
            if (DEBUG_API) {
                console.debug('GET Error:', { endpoint, error: errorMessage });
            }
            return { error: errorMessage, details: error.response?.data };
        }
    }

    async getProductReviews(productId: number): Promise<ApiResponse<any[]>> {
        try {
            const endpoint = this.ENDPOINTS.PRODUCT_REVIEWS(productId);
            const response = await this.client.get<any[]>(endpoint);
            const data = Array.isArray(response.data)
                ? response.data
                : Array.isArray((response.data as any)?.reviews)
                    ? (response.data as any).reviews
                    : [];
            return { data };
        } catch (error: any) {
            return { data: [], error: error.message };
        }
    }

    async deleteReview(reviewId: number): Promise<ApiResponse<void>> {
        try {
            const endpoint = this.ENDPOINTS.ADMIN_REVIEW(reviewId);
            const response = await retryRequest(() => this.client.delete(endpoint));
            return { data: response.data };
        } catch (error: any) {
            return { data: null as any, error: error.message };
        }
    }

    async post<T = any>(endpoint: string, data: any): Promise<ApiResponse<T>> {
        try {
            if (process.env.NODE_ENV === 'development') {
                console.debug('Making POST request to:', endpoint);
                console.debug('Request payload:', JSON.stringify(data, null, 2));
            }
            
            const response = await this.client.post<T>(endpoint, data);
            
            if (process.env.NODE_ENV === 'development') {
                console.debug('POST response:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data
                });
            }
            
            return { data: response.data };
        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
                console.debug('POST request error:', error);
                console.debug('Error details:', {
                    message: error.message,
                    code: error.code,
                    response: error.response?.data,
                    status: error.response?.status
                });
            }

            if (!error.response || error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
                return { 
                    error: 'Unable to connect to the server. Please check your internet connection and try again.'
                };
            }

            return {
                data: null,
                error: error.response?.data?.error || error.message || 'An error occurred'
            };
        }
    }

    async put<T = any>(endpoint: string, data: any): Promise<ApiResponse<T>> {
        try {
            const headers = await this.getHeaders();
            const response = await this.client.put<T>(endpoint, data, { headers });
            return { data: response.data };
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.debug('[API Service] PUT request failed:', error);
            }
            return { error: this.handleError(error) };
        }
    }

    async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
        try {
            const response = await retryRequest(() => this.client.delete<T>(endpoint));
            return { data: response.data };
        } catch (error) {
            return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
        try {
            const response = await this.client.post<AuthResponse>(this.ENDPOINTS.LOGIN, { email, password });
            
            if (response.data?.token) {
                await AsyncStorage.setItem('auth_token', response.data.token);
                this.client.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
                
                // Decode token to check role
                try {
                    const decodedToken = JSON.parse(atob(response.data.token.split('.')[1]));
                    await AsyncStorage.setItem('user_role', decodedToken.role);
                } catch (error) {
                    // Silently handle token decode error
                    if (process.env.NODE_ENV === 'development') {
                        console.debug('[API] Token decode error');
                    }
                }
                
                return { data: response.data };
            }
            
            return {
                data: null,
                error: 'Invalid email or password'
            };
        } catch (error) {
            // Handle errors silently without logging to console
            if (axios.isAxiosError(error)) {
                if (!error.response || error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
                    return { 
                        error: 'Unable to connect to the server. Please check your internet connection.'
                    };
                }
                
                // Always return a user-friendly message for 400 status
                if (error.response?.status === 400) {
                    return {
                        error: 'Invalid email or password'
                    };
                }
                
                if (error.response?.status === 429) {
                    return {
                        error: 'Too many login attempts. Please try again later.'
                    };
                }
            }
            
            return {
                error: 'Unable to log in. Please try again.'
            };
        }
    }

    async register(name: string, email: string, password: string): Promise<ApiResponse<AuthResponse>> {
        try {
            const response = await this.post<AuthResponse>(this.ENDPOINTS.AUTH.REGISTER, {
                name,
                email,
                password
            });
            
            if (response.data?.token) {
                await AsyncStorage.setItem('auth_token', response.data.token);
                this.client.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
            }
            
            return response;
        } catch (error) {
            console.error('Registration error:', error);
            
            if (axios.isAxiosError(error)) {
                return {
                    data: null,
                    error: error.response?.data?.error || 'Registration failed. Please try again.'
                };
            }
            
            return {
                data: null,
                error: 'An unexpected error occurred'
            };
        }
    }

    async logout(): Promise<ApiResponse<void>> {
        try {
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('user_role');
            await AsyncStorage.removeItem('cart_items');
            await AsyncStorage.removeItem('wishlist_items');
            this.client.defaults.headers.common['Authorization'] = '';
            return { data: null };
        } catch (error) {
            return {
                data: null,
                error: 'Failed to logout'
            };
        }
    }

    async getUserDashboard(): Promise<ApiResponse<any>> {
        return this.get(this.ENDPOINTS.USER_DASHBOARD);
    }

    async getCategories(): Promise<ApiResponse<Category[]>> {
        return this.get<Category[]>(this.ENDPOINTS.CATEGORIES);
    }

    async getCategoryDetails<T>(id: number): Promise<ApiResponse<T>> {
        return this.get<T>(this.ENDPOINTS.CATEGORY_DETAILS(id));
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await this.client.get(this.ENDPOINTS.HEALTH, {
                timeout: 2000 // Shorter timeout for health check
            });
            return response.status === 200;
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.warn('Connection test failed:', error.message);
            }
            return false;
        }
    }

    async getAddresses(): Promise<Address[]> {
        try {
            const response = await this.get<Address[]>(this.ENDPOINTS.ADDRESSES);
            if (response.error) {
                throw new Error(response.error);
            }
            return response.data || [];
        } catch (error) {
            console.error('Error getting addresses:', error);
            throw error;
        }
    }

    async addAddress(address: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Address> {
        try {
            console.log('Raw address data:', address);
            
            // Validate required fields
            const requiredFields = ['full_name', 'phone_number', 'address_line1', 'city', 'state', 'postal_code'];
            const missingFields = requiredFields.filter(field => !address[field as keyof typeof address]);
            
            console.log('Validation check:', {
                requiredFields,
                missingFields,
                fieldValues: {
                    full_name: address.full_name,
                    phone_number: address.phone_number,
                    address_line1: address.address_line1,
                    city: address.city,
                    state: address.state,
                    postal_code: address.postal_code
                }
            });

            if (missingFields.length > 0) {
                console.error('Missing required fields:', missingFields);
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }

            // Trim all string values
            const trimmedAddress = Object.entries(address).reduce((acc, [key, value]) => ({
                ...acc,
                [key]: typeof value === 'string' ? value.trim() : value
            }), {} as typeof address);

            console.log('Trimmed address data:', trimmedAddress);

            const response = await this.post<Address>(this.ENDPOINTS.ADDRESSES, trimmedAddress);
            console.log('API response:', response);

            if (response.error) {
                throw new Error(response.error);
            }

            return response.data as Address;
        } catch (error) {
            console.error('Error in addAddress:', error);
            throw error;
        }
    }

    async updateAddress(id: number, address: Partial<Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Address> {
        try {
            const response = await this.put<Address>(this.ENDPOINTS.ADDRESS(id), address);
            if (!response.data) {
                throw new Error('Failed to update address');
            }
            return response.data;
        } catch (error) {
            console.error('Error in updateAddress:', error);
            throw error;
        }
    }

    async deleteAddress(id: number): Promise<void> {
        try {
            await this.delete(this.ENDPOINTS.ADDRESS(id));
        } catch (error) {
            console.error('Error in deleteAddress:', error);
            throw error;
        }
    }

    async getUserProfile(): Promise<ApiResponse<UserProfile>> {
        return this.get<UserProfile>(this.ENDPOINTS.USER_PROFILE);
    }

    async updateUserProfile(data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
        return this.put<UserProfile>(this.ENDPOINTS.USER_PROFILE, data);
    }

    async uploadProfilePhoto(formData: FormData): Promise<ApiResponse<{ photo_url: string }>> {
        try {
            console.log('Uploading profile photo to:', this.ENDPOINTS.USER_PROFILE_PHOTO);
            
            // Create a new FormData instance and append the file
            const photoData = formData.get('photo');
            if (!photoData) {
                throw new Error('No photo data provided');
            }

            // Make sure we're using the correct endpoint without /api prefix since it's already in baseURL
            const response = await this.client.post(this.ENDPOINTS.USER_PROFILE_PHOTO, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Accept': 'application/json'
                },
                transformRequest: (data, headers) => {
                    // Return the FormData instance directly
                    return data;
                },
            });
            
            console.log('Upload response:', response.data);
            
            if (response.data && response.data.photo_url) {
                // Update the user profile with the new photo URL
                await this.updateUserProfile({ photo_url: response.data.photo_url });
            }
            
            return { data: response.data };
        } catch (error) {
            console.error('Error uploading profile photo:', error);
            if (error instanceof AxiosError) {
                console.error('Full error details:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    headers: error.response?.headers,
                    config: error.config
                });
                
                // Check if it's a 404 error and provide a more specific message
                if (error.response?.status === 404) {
                    return {
                        data: null,
                        error: 'The photo upload service is currently unavailable. Please try again later.'
                    };
                }
                
                return {
                    data: null,
                    error: error.response?.data?.error || 'Failed to upload profile photo'
                };
            }
            return { 
                data: null, 
                error: error instanceof Error ? error.message : 'Failed to upload profile photo' 
            };
        }
    }

    async getAdminCategories(): Promise<ApiResponse<Category[]>> {
        return this.get<Category[]>(this.ENDPOINTS.ADMIN_CATEGORIES);
    }

    async addCategory(data: { name: string; description: string }): Promise<ApiResponse<Category>> {
        return this.post<Category>(this.ENDPOINTS.ADMIN_CATEGORIES, data);
    }

    async updateCategory(id: number, data: Partial<Category>): Promise<ApiResponse<Category>> {
        return this.put<Category>(this.ENDPOINTS.ADMIN_CATEGORY(id), data);
    }

    async deleteCategory(id: number): Promise<ApiResponse<void>> {
        return this.delete(this.ENDPOINTS.ADMIN_CATEGORY(id));
    }

    async getAdminProducts(queryParams?: string): Promise<ApiResponse<ProductData[]>> {
        try {
            // Cache hit within 30s
            const now = Date.now();
            if (this.adminProductsCache && now - this.adminProductsCache.ts < 30000) {
                return { data: this.adminProductsCache.data };
            }
            // Deduplicate in-flight
            if (this.adminProductsInFlight) {
                return await this.adminProductsInFlight;
            }

            if (DEBUG_API) {
                console.log('[API] Making request to get admin products...');
            }
            const endpoint = this.ENDPOINTS.ADMIN_PRODUCTS;
            if (DEBUG_API) {
                console.log('[API] Request URL:', `${this.client.defaults.baseURL}${endpoint}`);
            }
            
            interface ProductResponse {
                products?: ProductData[];
            }
            this.adminProductsInFlight = this.client.get<ProductData[] | ProductResponse>(endpoint)
                .then((response) => {
                    if (!response.data) {
                        if (DEBUG_API) {
                            console.log('[API] No data in response');
                        }
                        const res = { data: [] as ProductData[] };
                        this.adminProductsCache = { data: res.data, ts: Date.now() };
                        return res;
                    }
                    // Ensure we're returning an array of products with proper type checking
                    const products = Array.isArray(response.data) ? response.data :
                                   (response.data as ProductResponse).products || [];
                    
                    if (DEBUG_API) {
                        console.log('[API] Fetched products count:', products.length);
                    }
                    const res = { data: products };
                    this.adminProductsCache = { data: products, ts: Date.now() };
                    return res;
                })
                .catch((error) => {
                    console.error('[API] Error in getAdminProducts:', error);
                    if (axios.isAxiosError(error)) {
                        return {
                            data: null,
                            error: error.response?.data?.error || error.message,
                            details: error.response?.data
                        } as any;
                    }
                    return { 
                        data: null, 
                        error: error instanceof Error ? error.message : 'Failed to fetch products'
                    } as any;
                })
                .finally(() => {
                    this.adminProductsInFlight = null;
                });
            return await this.adminProductsInFlight;
        } catch (error) {
            console.error('[API] Error in getAdminProducts:', error);
            if (axios.isAxiosError(error)) {
                return {
                    data: null,
                    error: error.response?.data?.error || error.message,
                    details: error.response?.data
                };
            }
            return { 
                data: null, 
                error: error instanceof Error ? error.message : 'Failed to fetch products'
            };
        }
    }

    // Combo offers
    async getCombos(): Promise<ApiResponse<any[]>> {
        try {
            const response = await this.client.get(this.ENDPOINTS.COMBOS);
            return { data: response.data };
        } catch (error) {
            return { data: [], error: this.handleError(error) };
        }
    }

    async getComboDetails(id: number): Promise<ApiResponse<any>> {
        try {
            const response = await this.client.get(this.ENDPOINTS.COMBO_DETAILS(id));
            return { data: response.data };
        } catch (error) {
            return { error: this.handleError(error) };
        }
    }

    async getAllCombosAdmin(): Promise<ApiResponse<any[]>> {
        try {
            const now = Date.now();
            if (this.combosCache && now - this.combosCache.ts < 30000) {
                return { data: this.combosCache.data };
            }
            if (this.combosInFlight) {
                return await this.combosInFlight;
            }

            this.combosInFlight = this.client.get(this.ENDPOINTS.ADMIN_COMBOS_ALL)
                .then((response) => {
                    const data = Array.isArray(response.data) ? response.data : [];
                    this.combosCache = { data, ts: Date.now() };
                    return { data };
                })
                .catch((error) => {
                    return { data: [], error: this.handleError(error) } as any;
                })
                .finally(() => {
                    this.combosInFlight = null;
                });

            return await this.combosInFlight;
        } catch (error) {
            return { data: [], error: this.handleError(error) };
        }
    }

    async createCombo(comboData: any): Promise<ApiResponse<any>> {
        try {
            const response = await this.client.post(this.ENDPOINTS.ADMIN_COMBOS, comboData);
            return { data: response.data };
        } catch (error) {
            return { error: this.handleError(error) };
        }
    }

    async updateCombo(id: number, comboData: any): Promise<ApiResponse<any>> {
        try {
            const response = await this.client.put(`${this.ENDPOINTS.ADMIN_COMBOS}/${id}`, comboData);
            return { data: response.data };
        } catch (error) {
            return { error: this.handleError(error) };
        }
    }

    async deleteCombo(id: number): Promise<ApiResponse<void>> {
        try {
            const response = await this.client.delete(`${this.ENDPOINTS.ADMIN_COMBOS}/${id}`);
            return { data: response.data };
        } catch (error) {
            return { error: this.handleError(error) } as any;
        }
    }

    async addProduct(formData: FormData): Promise<ApiResponse<ProductData>> {
        try {
            if (DEBUG_API) {
                try {
                    const entries = Array.from(formData.entries()).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 60) : '[binary]']);
                    console.log('[API] Adding product - entries preview:', entries);
                } catch {}
            }
            
            // Get auth token for admin endpoint
            const token = await AsyncStorage.getItem('auth_token');
            
            const response = await this.client.post(
                this.ENDPOINTS.PRODUCTS,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': token ? `Bearer ${token}` : '',
                    },
                    timeout: 30000, // 30 seconds timeout for image upload
                }
            );

            if (DEBUG_API) console.log('[API] Product added successfully');
            return { data: response.data };
        } catch (error: any) {
            if (DEBUG_API) {
                console.error('[API] Error adding product:', {
                    status: error.response?.status,
                    url: this.ENDPOINTS.PRODUCTS,
                });
            }

            // Handle specific error cases
            if (error.response?.status === 404) {
                return {
                    data: null,
                    error: 'Product endpoint not found. Please check if the backend server is running and accessible.'
                };
            }

            if (error.response?.status === 401) {
                return {
                    data: null,
                    error: 'Unauthorized. Please log in again to add products.'
                };
            }

            if (error.response?.status === 403) {
                return {
                    data: null,
                    error: 'Access denied. You do not have permission to add products.'
                };
            }

            return {
                data: null,
                error: error.response?.data?.error || error.message || 'Failed to add product'
            };
        }
    }

    async updateProduct(productId: number, formData: FormData): Promise<ApiResponse<ProductData>> {
        try {
            if (DEBUG_API) console.log('[API] Updating product:', { productId });

            // Get the auth token
            const token = await AsyncStorage.getItem('auth_token');
            
            const response = await this.client.put(
                `${this.ENDPOINTS.PRODUCTS}/${productId}`,
                formData,
                {
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : '',
                    },
                    timeout: 30000, // 30 seconds timeout for image upload
                }
            );

            if (DEBUG_API) console.log('[API] Product update OK');
            return { data: response.data };
        } catch (error: any) {
            if (DEBUG_API) {
                console.error('[API] Error updating product:', {
                    status: error.response?.status,
                });
            }

            // Handle specific error cases
            if (!error.response) {
                return {
                    data: null,
                    error: 'Network error. Please check your connection.'
                };
            }

            if (error.response.status === 401) {
                return {
                    data: null,
                    error: 'Unauthorized. Please log in again.'
                };
            }

            if (error.response.status === 404) {
                return {
                    data: null,
                    error: 'Product not found.'
                };
            }

            return {
                data: null,
                error: error.response?.data?.error || error.message || 'Failed to update product'
            };
        }
    }

    async deleteProduct(id: number): Promise<ApiResponse<void>> {
        try {
            if (DEBUG_API) console.log('Deleting product:', id);
            const response = await this.client.delete(this.ENDPOINTS.PRODUCT_DETAILS(id));
            
            if (DEBUG_API) console.log('Delete OK');
            return { data: response.data };
        } catch (error) {
            if (DEBUG_API) console.error('Delete product error');
            if (axios.isAxiosError(error)) {
                return {
                    data: null,
                    error: error.response?.data?.error || error.message
                };
            }
            return {
                data: null,
                error: error instanceof Error ? error.message : 'Failed to delete product'
            };
        }
    }

    async googleSignIn(idToken: string): Promise<ApiResponse<GoogleAuthResponse>> {
        try {
            const response = await this.post<GoogleAuthResponse>('/auth/google', { idToken });
            
            if (response.data?.token) {
                await AsyncStorage.setItem('auth_token', response.data.token);
                this.client.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
            }
            
            return response;
        } catch (error) {
            console.error('Google Sign-In error:', error);
            
            if (axios.isAxiosError(error)) {
                return {
                    data: null,
                    error: error.response?.data?.error || 'Google Sign-In failed. Please try again.'
                };
            }
            
            return {
                data: null,
                error: 'An unexpected error occurred during Google Sign-In'
            };
        }
    }

    async getNotifications(): Promise<ApiResponse<any>> {
        return this.get(this.ENDPOINTS.NOTIFICATIONS);
    }

    async markNotificationAsRead(id: number): Promise<ApiResponse<void>> {
        return this.put(this.ENDPOINTS.NOTIFICATION_READ(id), {});
    }

    getFullImageUrl(imageUrl: string | undefined): string {
        if (!imageUrl) return 'https://via.placeholder.com/144x144/f8f9fa/666666?text=No+Image';
        
        try {
            // If it's already a full URL, return it
            if (imageUrl.startsWith('http')) {
                return imageUrl;
            }
            
            // Get the base URL from the API configuration
            const baseUrl = API_BASE_URL.replace('/api', '');
            
            // Handle different path formats
            let fullUrl;
            if (imageUrl.startsWith('/uploads/')) {
                fullUrl = `${baseUrl}${imageUrl}`;
            } else if (imageUrl.startsWith('uploads/')) {
                fullUrl = `${baseUrl}/${imageUrl}`;
            } else {
                fullUrl = `${baseUrl}/uploads/${imageUrl}`;
            }

            // Return the constructed URL - let the Image component handle loading errors
            return fullUrl;
        } catch (error) {
            if (__DEV__) console.error('Error processing image URL');
            return 'https://via.placeholder.com/144x144/f8f9fa/666666?text=No+Image';
        }
    }

    async requestPasswordReset(emailOrPhone: string): Promise<ApiResponse<{ message: string }>> {
        try {
            const response = await this.post(this.ENDPOINTS.FORGOT_PASSWORD, { emailOrPhone });
            return response;
        } catch (error) {
            return { error: 'Failed to send reset code' };
        }
    }

    async verifyResetOtp(emailOrPhone: string, otp: string): Promise<ApiResponse<{ message: string }>> {
        try {
            const response = await this.post(this.ENDPOINTS.VERIFY_RESET_OTP, { emailOrPhone, otp });
            return response;
        } catch (error) {
            return { error: 'Failed to verify OTP' };
        }
    }

    async resetPassword(emailOrPhone: string, otp: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
        try {
            const response = await this.post(this.ENDPOINTS.RESET_PASSWORD, {
                emailOrPhone,
                otp,
                newPassword
            });
            return response;
        } catch (error) {
            return { error: 'Failed to reset password' };
        }
    }

    async validateCoupon(couponCode: string, cartItems: any[]): Promise<ApiResponse<any>> {
        try {
            if (DEBUG_API) {
                console.log('[API] Validating coupon:', {
                    code: couponCode,
                    items: cartItems
                });
            }

            const response = await this.post(this.ENDPOINTS.VALIDATE_COUPON, {
                code: couponCode,
                products: cartItems
            });

            if (DEBUG_API) {
                console.log('[API] Coupon validation response:', response);
            }
            return response;
        } catch (error: any) {
            if (DEBUG_API) {
                console.error('[API] Coupon validation error:', error);
            }
            return {
                data: null,
                error: error.response?.data?.error || error.message || 'Failed to validate coupon'
            };
        }
    }

    async applyCoupon(couponCode: string, cartItems: any[]): Promise<ApiResponse<any>> {
        try {
            if (DEBUG_API) {
                console.log('[API] Applying coupon:', {
                    code: couponCode,
                    items: cartItems
                });
            }

            const response = await this.post(this.ENDPOINTS.APPLY_COUPON, {
                code: couponCode,
                cart_items: cartItems
            });

            if (DEBUG_API) {
                console.log('[API] Coupon application response:', response);
            }

            if (!response.data) {
                throw new Error('No data received from server');
            }

            return {
                data: {
                    ...response.data,
                    discount_amount: response.data.discount_amount || 0
                }
            };
        } catch (error: any) {
            if (DEBUG_API) {
                console.error('[API] Coupon application error:', error);
            }
            return {
                data: null,
                error: error.response?.data?.error || error.message || 'Failed to apply coupon'
            };
        }
    }

    async getCoupons(): Promise<ApiResponse<any[]>> {
        try {
            // Cache hit within 30s
            const now = Date.now();
            if (this.couponsCache && now - this.couponsCache.ts < 30000) {
                return { data: this.couponsCache.data };
            }
            // Deduplicate in-flight
            if (this.couponsInFlight) {
                return await this.couponsInFlight;
            }

            if (DEBUG_API) {
                console.log('[API] Fetching coupons from:', this.ENDPOINTS.GET_COUPONS);
            }
            this.couponsInFlight = this.client.get(this.ENDPOINTS.GET_COUPONS)
                .then((response) => {
                    if (DEBUG_API) {
                        console.log('[API] Coupons response:', {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                            dataPreview: (() => {
                                try {
                                    const str = JSON.stringify(response.data);
                                    return str.length > 400 ? `${str.slice(0, 400)}… (+${str.length - 400} chars)` : str;
                                } catch {
                                    return '[unserializable]';
                                }
                            })(),
                            dataType: typeof response.data,
                            isArray: Array.isArray(response.data)
                        });
                    }
                    
                    if (!response.data) {
                        if (DEBUG_API) {
                            console.log('[API] No data in coupons response');
                        }
                        const res = { data: [] as any[] };
                        this.couponsCache = { data: res.data, ts: Date.now() };
                        return res;
                    }
        
                    // Ensure we're returning an array and transform the data if needed
                    let coupons = Array.isArray(response.data) ? response.data : 
                                 Array.isArray(response.data.data) ? response.data.data : [];
        
                    // Transform the coupons to ensure consistent data structure
                    coupons = coupons.map((coupon: any) => ({
                        id: coupon.id,
                        code: coupon.code,
                        description: coupon.description,
                        discount_type: (coupon.discount_type || '').toLowerCase(),
                        discount_value: Number(coupon.discount_value),
                        min_purchase_amount: Number(coupon.min_purchase_amount),
                        end_date: coupon.end_date,
                        is_active: Boolean(coupon.is_active)
                    }));
                    
                    if (DEBUG_API) {
                        console.log('[API] Processed coupons count:', Array.isArray(coupons) ? coupons.length : 0);
                    }
                    const res = { data: coupons };
                    this.couponsCache = { data: coupons, ts: Date.now() };
                    return res;
                })
                .catch((error: any) => {
                    console.error('[API] Error fetching coupons:', {
                        message: error.message,
                        status: error.response?.status,
                        data: error.response?.data,
                        stack: error.stack
                    });
                    return {
                        data: [],
                        error: error.response?.data?.error || error.message || 'Failed to fetch coupons'
                    } as any;
                })
                .finally(() => {
                    this.couponsInFlight = null;
                });
            return await this.couponsInFlight;
        } catch (error: any) {
            console.error('[API] Error fetching coupons:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
                stack: error.stack
            });
            
            return {
                data: null,
                error: error.response?.data?.error || error.message || 'Failed to fetch coupons'
            };
        }
    }

    async createCoupon(couponData: any): Promise<ApiResponse<any>> {
        return this.post(this.ENDPOINTS.ADMIN_COUPONS, couponData);
    }

    async updateCoupon(id: number, couponData: any): Promise<ApiResponse<any>> {
        return this.put(`${this.ENDPOINTS.ADMIN_COUPONS}/${id}`, couponData);
    }

    async deleteCoupon(id: number): Promise<ApiResponse<void>> {
        return this.delete(`${this.ENDPOINTS.ADMIN_COUPONS}/${id}`);
    }

    async getCartItems(): Promise<any[]> {
        try {
            if (DEBUG_API) {
                console.log('[API] Fetching cart items...');
            }
            const response = await this.get<any>(this.ENDPOINTS.CART);
            
            if (response.error) {
                if (DEBUG_API) {
                    console.error('[API] Error fetching cart:', response.error);
                }
                return [];
            }

            const cartItems = Array.isArray(response.data) ? response.data : [];
            if (DEBUG_API) {
                console.log('[API] Cart items:', cartItems);
            }
            return cartItems;
        } catch (error) {
            if (DEBUG_API) {
                console.error('[API] Error fetching cart items:', error);
            }
            return [];
        }
    }

    async getPaymentMethods(): Promise<any[]> {
        try {
            if (DEBUG_API) {
                console.log('[API] Fetching payment methods from:', this.ENDPOINTS.PAYMENT_METHODS);
            }
            const response = await this.get<any[]>(this.ENDPOINTS.PAYMENT_METHODS);
            
            if (response.error) {
                if (DEBUG_API) {
                    console.warn('[API] Error fetching payment methods:', response.error);
                }
                throw new Error(response.error);
            }
            
            if (!response.data) {
                if (DEBUG_API) {
                    console.warn('[API] No payment methods data received');
                }
                throw new Error('No payment methods available');
            }
            
            if (DEBUG_API) {
                console.log('[API] Payment methods fetched successfully:', response.data);
            }
            return response.data;
        } catch (error) {
            if (DEBUG_API) {
                console.error('[API] Error in getPaymentMethods:', error);
            }
            // Return default payment methods as fallback
            const defaultMethods = [
                {
                    id: 'cod',
                    type: 'COD',
                    name: 'Cash on Delivery',
                    description: 'Pay when you receive your order',
                    isDefault: true
                },
                {
                    id: 'card',
                    type: 'CARD',
                    name: 'Credit/Debit Card',
                    description: 'Pay securely with your card',
                    isDefault: false
                }
            ];
            if (DEBUG_API) {
                console.log('[API] Returning default payment methods');
            }
            return defaultMethods;
        }
    }

    async createOrder(orderData: any): Promise<any> {
        try {
            // Validate required fields
            if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
                throw new Error('Order must contain items');
            }

            if (!orderData.shipping_address) {
                throw new Error('Shipping address is required');
            }

            if (!orderData.payment_method) {
                throw new Error('Payment method is required');
            }

            // Ensure all items have required fields
            const validItems = orderData.items.every((item: any) => 
                item.product_id && 
                item.quantity && 
                item.price && 
                item.name
            );

            if (!validItems) {
                throw new Error('All items must have product_id, quantity, price, and name');
            }

            // Calculate total if not provided
            if (!orderData.total_amount) {
                orderData.total_amount = orderData.items.reduce((sum: number, item: any) => {
                    return sum + (item.price * item.quantity);
                }, 0);
            }

            // Log the order data before sending
            if (DEBUG_API) {
                try {
                    console.log('[API] Creating order with payload:', JSON.stringify(orderData, null, 2));
                } catch {
                    console.log('[API] Creating order with payload: [unserializable]');
                }
            }

            const response = await this.post<any>(this.ENDPOINTS.ORDERS, orderData);

            if (response.error) {
                if (DEBUG_API) {
                    console.error('[API] Order creation failed:', response.error);
                }
                throw new Error(response.error);
            }

            if (!response.data) {
                if (DEBUG_API) {
                    console.error('[API] No data received from order creation');
                }
                throw new Error('Failed to create order: No response data');
            }

            if (DEBUG_API) {
                console.log('[API] Order created successfully:', response.data);
            }
            return response.data;
        } catch (error) {
            if (DEBUG_API) {
                console.error('[API] Error creating order:', error);
            }
            throw error;
        }
    }

    async requestSignupOTP(email: string): Promise<ApiResponse<{ message: string }>> {
        try {
            if (DEBUG_API) {
                console.log('[API] Requesting signup OTP for:', email);
                console.log('[API] Using base URL:', this.client.defaults.baseURL);
            }
            
            const response = await this.client.post(
                this.ENDPOINTS.REQUEST_SIGNUP_OTP,
                { email },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );
            
            if (DEBUG_API) {
                console.log('[API] OTP request response:', {
                    status: response.status,
                    data: response.data
                });
            }
            
            return { data: response.data };
        } catch (error: any) {
            console.error('[API] Error in requestSignupOTP:', error);
            
            // Check if it's a network error
            if (!error.response) {
                return { 
                    error: 'Unable to connect to the server. Please check your connection.',
                    details: {
                        baseUrl: this.client.defaults.baseURL,
                        endpoint: this.ENDPOINTS.REQUEST_SIGNUP_OTP
                    }
                };
            }
            
            // Handle specific error responses
            if (error.response?.status === 400) {
                return { error: error.response.data?.error || 'Invalid email address' };
            }
            
            return { 
                error: error.response?.data?.error || error.message || 'Failed to send verification code',
                details: {
                    status: error.response?.status,
                    data: error.response?.data
                }
            };
        }
    }

    async verifySignupOTP(email: string, otp: string, name: string, password: string): Promise<ApiResponse<AuthResponse>> {
        try {
            const response = await this.post<AuthResponse>(this.ENDPOINTS.VERIFY_SIGNUP_OTP, {
                email,
                otp,
                name,
                password
            });

            if (response.data?.token) {
                await AsyncStorage.setItem('auth_token', response.data.token);
                this.client.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
            }
            return response;
        } catch (error: any) {
            // Handle specific error cases with user-friendly messages
            if (axios.isAxiosError(error)) {
                if (!error.response || error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
                    return { 
                        error: 'Unable to connect to the server. Please check your internet connection.'
                    };
                }
                
                if (error.response?.status === 400) {
                    const errorMessage = error.response.data?.error;
                    if (errorMessage?.includes('expired')) {
                        return { error: 'Verification code has expired. Please request a new one.' };
                    }
                    if (errorMessage?.includes('Too many failed attempts')) {
                        return { error: 'Too many failed attempts. Please request a new code.' };
                    }
                    return { error: 'Invalid verification code. Please try again.' };
                }
            }
            
            return {
                error: 'Failed to verify code. Please try again.'
            };
        }
    }

    private async getHeaders() {
        const token = await AsyncStorage.getItem('auth_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
        };
    }

    private handleError(error: unknown): string {
        if (axios.isAxiosError(error)) {
            // Handle Axios error
            if (error.response) {
                // Server responded with error status
                const status = error.response.status;
                const serverMessage = error.response.data?.error || error.response.data?.message;

                // Map common status codes to user-friendly messages
                switch (status) {
                    case 400:
                        return serverMessage || 'Invalid request. Please check your input.';
                    case 401:
                        return 'Please login to continue.';
                    case 403:
                        return 'You do not have permission to perform this action.';
                    case 404:
                        return 'The requested resource was not found.';
                    case 422:
                        return serverMessage || 'Invalid input data provided.';
                    case 429:
                        return 'Too many requests. Please try again later.';
                    case 500:
                        return 'An internal server error occurred. Please try again later.';
                    default:
                        return 'Something went wrong. Please try again.';
                }
            } else if (error.request) {
                // Request made but no response received
                return 'Unable to connect to server. Please check your internet connection.';
            }
        }
        // Generic error handling
        return 'An unexpected error occurred. Please try again.';
    }

    async updateOrderStatus(orderId: string, status: string): Promise<ApiResponse<any>> {
        try {
            const endpoint = this.ENDPOINTS.ADMIN_ORDER_STATUS(orderId);
            return await this.put(endpoint, { status });
        } catch (error) {
            console.error('[API Service] Update order status failed:', error);
            return { error: this.handleError(error) };
        }
    }

    private async initializeUserId() {
        try {
            const userId = await AsyncStorage.getItem('user_id');
            if (userId) {
                this.userId = userId;
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.debug('Error initializing user ID:', error);
            }
        }
    }
}

// Export a singleton instance
export const apiService = new Api();