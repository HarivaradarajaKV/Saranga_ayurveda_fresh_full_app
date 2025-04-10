import { Platform } from 'react-native';
import Constants from 'expo-constants';
import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
    ApiService, 
    ApiResponse, 
    ProductData,
    AuthResponse,
    GoogleAuthResponse,
    UserProfile,
    Category,
    Address 
} from '../types/api';

// Define types for image handling
interface ImageData {
    uri: string;
    type?: string;
    name?: string;
}

// WebSocket connection and handlers
let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
const wsSubscribers = new Set<(data: any) => void>();

// Initialize WebSocket connection
const initWebSocket = async (userId: string | null) => {
    if (!userId) return;
    
    try {
        const ip = getLocalIpAddress();
        const wsUrl = `ws://${ip}:5001`;
        
        if (ws?.readyState === WebSocket.OPEN) {
            console.log('[WebSocket] Already connected');
            return;
        }

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('[WebSocket] Connected');
            // Authenticate the WebSocket connection
            if (userId) {
                ws?.send(JSON.stringify({
                    type: 'auth',
                    userId
                }));
                // Request initial sync after connection
                ws?.send(JSON.stringify({
                    type: 'sync_request',
                    userId,
                    data: {
                        cart: true,
                        wishlist: true,
                        profile: true
                    }
                }));
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[WebSocket] Received message:', data);
                // Notify all subscribers
                wsSubscribers.forEach(callback => callback(data));
            } catch (error) {
                console.error('[WebSocket] Message parse error:', error);
            }
        };

        ws.onclose = () => {
            console.log('[WebSocket] Disconnected');
            // Attempt to reconnect after 5 seconds
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(() => initWebSocket(userId), 5000);
        };

        ws.onerror = (error) => {
            console.error('[WebSocket] Error:', error);
        };
    } catch (error) {
        console.error('[WebSocket] Setup error:', error);
    }
};

// Subscribe to WebSocket updates
export const subscribeToUpdates = (callback: (data: any) => void) => {
    wsSubscribers.add(callback);
    return () => wsSubscribers.delete(callback);
};

// Send update through WebSocket
const sendUpdate = (userId: string, action: string, payload: any) => {
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'update',
            userId,
            action,
            payload
        }));
    }
};

// Get the local IP address from Expo Constants
const getLocalIpAddress = () => {
  try {
    console.log('[API Config] Getting local IP address');
    
    // For web platform
    if (Platform.OS === 'web') {
      console.log('[API Config] Using localhost for web platform');
      return 'localhost';
    }
    
    // For Expo Go
    if (__DEV__) {
      // Try to get IP from Expo manifest
      if (Constants.manifest2?.extra?.expoGo?.debuggerHost) {
        const ip = Constants.manifest2.extra.expoGo.debuggerHost.split(':')[0];
        console.log('[API Config] Using Expo debuggerHost IP:', ip);
        return ip;
      }

      // Try to get IP from hostUri
      if (Constants.manifest2?.hostUri) {
        const ip = Constants.manifest2.hostUri.split(':')[0];
        console.log('[API Config] Using Expo hostUri IP:', ip);
        return ip;
      }
    }
    
    // Final fallback to localhost
    console.log('[API Config] Using localhost as fallback');
    return 'localhost';
    
  } catch (error) {
    console.error('[API Config] Error getting IP address:', error);
    return 'localhost';
  }
};

// Get base URL using the local IP address
export const getBaseUrl = () => {
    // Return the production URL directly
    return 'https://ayurveda-saranga-backend.vercel.app/api';
};

// Test if the API is reachable
export const testApiReachable = async () => {
    try {
        const url = getBaseUrl();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${url}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.error('[API Config] API health check failed:', response.status, response.statusText);
            return false;
        }
        
        console.log('[API Config] API is reachable');
        return true;
    } catch (error) {
        console.error('[API Config] API is not reachable:', error);
        return false;
    }
};

const DEV_API_URL = getBaseUrl();
console.log('[API Config] API Base URL:', DEV_API_URL);

export const API_BASE_URL = 'https://ayurveda-saranga-backend.vercel.app/api';

// Update API configuration with improved settings
export const API_CONFIG = {
    TIMEOUT: 120000, // Increased timeout to 2 minutes for image uploads
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    BASE_URL: API_BASE_URL,
    ENDPOINTS: {
      // Auth object for grouped auth endpoints
      AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
      },
      
      // Health check
      HEALTH: '/health',
      
      // Auth endpoints
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      FORGOT_PASSWORD: '/auth/forgot-password',
      VERIFY_RESET_OTP: '/auth/verify-reset-otp',
      RESET_PASSWORD: '/auth/reset-password',
      REQUEST_SIGNUP_OTP: '/auth/request-signup-otp',
      VERIFY_SIGNUP_OTP: '/auth/verify-signup-otp',
      
      // Product endpoints
      PRODUCTS: '/products',
      PRODUCT_DETAILS: (id: number) => `/products/${id}`,
      PRODUCT_REVIEWS: (id: number) => `/products/${id}/reviews`,
      BRAND_REVIEWS: '/brand-reviews',
      
      // Category endpoints
      CATEGORIES: '/categories',
      CATEGORY_DETAILS: (id: number) => `/categories/${id}`,
      
      // Cart endpoints
      CART: '/cart',
      CART_ITEM: (id: number) => `/cart/${id}`,
      CART_TOGGLE: (id: number) => `/cart/${id}/select`,
      
      // Wishlist endpoints
      WISHLIST: '/wishlist',
      WISHLIST_ITEM: (id: number) => `/wishlist/${id}`,
      
      // Order endpoints
      ORDERS: '/orders',
      ORDER_DETAILS: (id: number) => `/orders/${id}`,
      
      // User endpoints
      USER_DASHBOARD: '/users/dashboard',
      USER_PROFILE: '/users/profile',
      USER_PROFILE_PHOTO: '/users/profile/photo',
      
      // Admin endpoints
      ADMIN_STATS: '/admin/stats',
      ADMIN_PRODUCTS: '/products',
      ADMIN_PRODUCT: (id: number) => `/admin/products/${id}`,
      ADMIN_ORDERS: '/admin/orders',
      ADMIN_ORDER_STATUS: (id: string) => `/admin/orders/${id}/status`,
      ADMIN_USERS: '/admin/users',
      ADMIN_CATEGORIES: '/admin/categories',
      ADMIN_CATEGORY: (id: number) => `/admin/categories/${id}`,
      
      // Address endpoints
      ADDRESSES: '/addresses',
      ADDRESS: (id: number) => `/addresses/${id}`,
      ADDRESS_DEFAULT: (id: number) => `/addresses/${id}/default`,
      
      // Notification endpoints
      NOTIFICATIONS: '/notifications',
      NOTIFICATION_READ: (id: number) => `/notifications/${id}/read`,
      
      // Coupon endpoints
      VALIDATE_COUPON: '/coupons/validate',
      APPLY_COUPON: '/coupons/apply',
      ADMIN_COUPONS: '/admin/coupons',
      GET_COUPONS: '/coupons',

      // Payment endpoints
      PAYMENT_METHODS: '/payments/payment-methods' as const,

      // Delivery endpoints
      CHECK_DELIVERY: (pincode: string) => `/check-delivery/${pincode}`,
    } as const,
    HEADERS: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    }
};

// Helper function to construct API URLs correctly
export const getApiUrl = (endpoint: string) => {
    // Remove any leading slash to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Add connection check with retry
export const checkNetworkConnection = async (retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const url = getBaseUrl();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${url}/health`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            if (response.ok) {
                console.log('[API] Network connection successful');
                return true;
            }
        } catch (error) {
            console.error(`[API] Network check attempt ${i + 1} failed:`, error);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    return false;
};

export class Api implements ApiService {
    ENDPOINTS = API_CONFIG.ENDPOINTS;
    private client: AxiosInstance;
    private userId: string | null = null;

    constructor() {
        // Create axios instance with retry configuration
        this.client = axios.create({
            baseURL: API_CONFIG.BASE_URL,
            timeout: API_CONFIG.TIMEOUT,
            headers: {
                ...API_CONFIG.HEADERS,
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        // Add request interceptor for debugging and error handling
        this.client.interceptors.request.use(
            async (config) => {
                try {
                    // Check network connection
                    const isConnected = await checkNetworkConnection();
                    if (!isConnected) {
                        throw new Error('Cannot connect to server. Please check your network connection.');
                    }

                    // Log request details
                    console.log('[API] Request:', {
                        method: config.method,
                        url: config.url,
                        baseURL: config.baseURL
                    });

                    return config;
                } catch (error) {
                    console.error('[API] Request preparation failed:', error);
                    return Promise.reject(error);
                }
            },
            (error) => {
                console.error('[API] Request Error:', error);
                return Promise.reject(error);
            }
        );

        // Add response interceptor for debugging
        this.client.interceptors.response.use(
            (response) => {
                console.log('[API] Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data,
                    headers: response.headers
                });
                return response;
            },
            (error) => {
                console.error('[API] Response Error:', {
                    message: error.message,
                    code: error.code,
                    response: error.response?.data,
                    status: error.response?.status,
                    headers: error.response?.headers,
                    config: {
                        url: error.config?.url,
                        method: error.config?.method,
                        baseURL: error.config?.baseURL,
                        headers: error.config?.headers
                    }
                });
                return Promise.reject(error);
            }
        );

        // Initialize user ID from storage
        this.initializeUserId();

        // Subscribe to WebSocket updates
        subscribeToUpdates(this.handleWebSocketUpdate);
    }

    private async initializeUserId() {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                if (user && user.id) {
                    this.userId = user.id;
                    // Initialize WebSocket connection
                    await initWebSocket(this.userId);
                }
            }
        } catch (error) {
            console.error('[API] Error initializing user ID:', error);
        }
    }

    // Base HTTP methods
    async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
        try {
            const response = await this.client.get<T>(endpoint);
            return { data: response.data };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    }

    async post<T = any>(endpoint: string, data: any): Promise<ApiResponse<T>> {
        try {
            const response = await this.client.post<T>(endpoint, data);
            return { data: response.data };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    }

    async put<T = any>(endpoint: string, data: any): Promise<ApiResponse<T>> {
        try {
            const response = await this.client.put<T>(endpoint, data);
            return { data: response.data };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    }

    async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
        try {
            const response = await this.client.delete<T>(endpoint);
            return { data: response.data };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    }

    // Auth methods
    async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
        const response = await this.post<AuthResponse>(this.ENDPOINTS.LOGIN, { email, password });
        const userData = response.data?.user as { id: string } | undefined;
        
        if (userData?.id) {
            this.userId = userData.id;
            await initWebSocket(this.userId);
        }
        return response;
    }

    async register(name: string, email: string, password: string): Promise<ApiResponse<AuthResponse>> {
        return this.post<AuthResponse>(this.ENDPOINTS.REGISTER, { name, email, password });
    }

    async logout(): Promise<ApiResponse<void>> {
        return this.post(this.ENDPOINTS.LOGOUT, {});
    }

    // User methods
    async getUserDashboard(): Promise<ApiResponse<any>> {
        return this.get(this.ENDPOINTS.USER_DASHBOARD);
    }

    async getUserProfile(): Promise<ApiResponse<UserProfile>> {
        return this.get(this.ENDPOINTS.USER_PROFILE);
    }

    async updateUserProfile(data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
        return this.put(this.ENDPOINTS.USER_PROFILE, data);
    }

    // Category methods
    async getCategories(): Promise<ApiResponse<Category[]>> {
        return this.get(this.ENDPOINTS.CATEGORIES);
    }

    async getCategoryDetails<T>(id: number): Promise<ApiResponse<T>> {
        return this.get(this.ENDPOINTS.CATEGORY_DETAILS(id));
    }

    // Product methods
    async getAdminProducts(queryParams?: string): Promise<ApiResponse<ProductData[]>> {
        const endpoint = queryParams ? `${this.ENDPOINTS.PRODUCTS}?${queryParams}` : this.ENDPOINTS.PRODUCTS;
        return this.get(endpoint);
    }

    async addProduct(formData: FormData): Promise<ApiResponse<ProductData>> {
        try {
            console.log('[API] Adding product');
            
            // Log FormData entries for debugging
            const formDataEntries = Array.from(formData.entries());
            console.log('[API] Form data entries:', formDataEntries);

            // Create a new FormData instance
            const processedFormData = new FormData();
            
            // Process each entry in the FormData
            for (const [key, value] of formDataEntries) {
                if (key === 'images') {
                    try {
                        // Handle image data
                        const imageData: ImageData = typeof value === 'string' ? JSON.parse(value) : value;
                        
                        if (imageData.uri) {
                            // If the image is from device/local storage
                            if (imageData.uri.startsWith('file://') || imageData.uri.startsWith('content://')) {
                                // @ts-ignore - React Native specific FormData handling
                                processedFormData.append('images', {
                                    uri: imageData.uri,
                                    type: imageData.type || 'image/jpeg',
                                    name: imageData.name || 'image.jpg'
                                });
                            }
                        }
                    } catch (err) {
                        console.warn('[API] Error processing image:', err);
                        // Continue with other fields if one image fails
                        continue;
                    }
                } else if (key === 'offer_percentage') {
                    // Ensure offer_percentage is properly handled as a number
                    const offerValue = typeof value === 'string' ? parseFloat(value) : value;
                    processedFormData.append(key, offerValue.toString());
                    console.log('[API] Processing offer percentage:', offerValue);
                } else {
                    // Handle other form fields
                    processedFormData.append(key, value as string);
                }
            }

            // Configure headers
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Accept': 'application/json'
                },
                timeout: 30000, // 30 seconds timeout
                maxBodyLength: Infinity, // Allow large file uploads
                maxContentLength: Infinity
            };

            // Make the request
            const response = await this.client.post<ProductData>(
                this.ENDPOINTS.PRODUCTS,
                processedFormData,
                config
            );
            
            console.log('[API] Product add response:', response.data);
            return { 
                data: response.data,
                error: undefined
            };
        } catch (error: any) {
            console.error('[API] Error adding product:', {
                error: error.message,
                response: error.response?.data,
                status: error.response?.status,
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers
            });

            // Return a more descriptive error message
            return { 
                data: null, 
                error: error.response?.data?.message || error.message || 'Failed to add product. Please check your connection and try again.'
            };
        }
    }

    async updateProduct(id: number, formData: FormData): Promise<ApiResponse<ProductData>> {
        try {
            console.log('[API] Updating product:', { id });
            
            // Log FormData entries for debugging
            const formDataEntries = Array.from(formData.entries());
            console.log('[API] Form data entries:', formDataEntries);

            // Configure headers and timeout for image upload
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Accept': 'application/json'
                },
                timeout: 60000, // Increase timeout to 60 seconds for image uploads
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                onUploadProgress: (progressEvent: any) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    console.log(`Upload Progress: ${percentCompleted}%`);
                }
            };

            // Make the request
            const response = await this.client.put<ProductData>(
                this.ENDPOINTS.ADMIN_PRODUCT(id),
                formData,
                config
            );

            console.log('[API] Product update response:', response.data);
            return {
                data: response.data,
                error: undefined
            };
        } catch (error: any) {
            console.error('[API] Error updating product:', error);
            return {
                data: undefined,
                error: error.message || 'Failed to update product'
            };
        }
    }

    async deleteProduct(id: number): Promise<ApiResponse<void>> {
        return this.delete(this.ENDPOINTS.ADMIN_PRODUCT(id));
    }

    // Address methods
    async getAddresses(): Promise<Address[]> {
        const response = await this.get<Address[]>(this.ENDPOINTS.ADDRESSES);
        return response.data || [];
    }

    async addAddress(address: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Address> {
        const response = await this.post<Address>(this.ENDPOINTS.ADDRESSES, address);
        if (response.error) throw new Error(response.error);
        return response.data!;
    }

    async updateAddress(id: number, address: Partial<Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Address> {
        const response = await this.put<Address>(this.ENDPOINTS.ADDRESS(id), address);
        if (response.error) throw new Error(response.error);
        return response.data!;
    }

    async deleteAddress(id: number): Promise<void> {
        await this.delete(this.ENDPOINTS.ADDRESS(id));
    }

    // Other required methods
    async testConnection(): Promise<boolean> {
        try {
            await this.get(this.ENDPOINTS.HEALTH);
            return true;
        } catch {
            return false;
        }
    }

    // Update cart methods with real-time sync
    async addToCart(productId: number, quantity: number): Promise<ApiResponse<any>> {
        const response = await this.post(this.ENDPOINTS.CART, { productId, quantity });
        if (response.data && this.userId) {
            sendUpdate(this.userId, 'CART_UPDATE', {
                type: 'ADD',
                productId,
                quantity,
                cart: response.data // Send full cart data
            });
        }
        return response;
    }

    async removeFromCart(productId: number): Promise<ApiResponse<any>> {
        const response = await this.delete(`${this.ENDPOINTS.CART}/${productId}`);
        if (response.data && this.userId) {
            sendUpdate(this.userId, 'CART_UPDATE', {
                type: 'REMOVE',
                productId,
                cart: response.data // Send full cart data
            });
        }
        return response;
    }

    async updateCartQuantity(productId: number, quantity: number): Promise<ApiResponse<any>> {
        const response = await this.put(`${this.ENDPOINTS.CART}/${productId}`, { quantity });
        if (response.data && this.userId) {
            sendUpdate(this.userId, 'CART_UPDATE', {
                type: 'UPDATE',
                productId,
                quantity,
                cart: response.data // Send full cart data
            });
        }
        return response;
    }

    // Update wishlist methods with real-time sync
    async addToWishlist(productId: number): Promise<ApiResponse<any>> {
        const response = await this.post(this.ENDPOINTS.WISHLIST, { productId });
        if (response.data && this.userId) {
            sendUpdate(this.userId, 'WISHLIST_UPDATE', {
                type: 'ADD',
                productId,
                wishlist: response.data // Send full wishlist data
            });
        }
        return response;
    }

    async removeFromWishlist(productId: number): Promise<ApiResponse<any>> {
        const response = await this.delete(`${this.ENDPOINTS.WISHLIST}/${productId}`);
        if (response.data && this.userId) {
            sendUpdate(this.userId, 'WISHLIST_UPDATE', {
                type: 'REMOVE',
                productId,
                wishlist: response.data // Send full wishlist data
            });
        }
        return response;
    }

    // Enhanced profile photo upload with better real-time sync
    async uploadProfilePhoto(formData: FormData): Promise<ApiResponse<{ photo_url: string }>> {
        const response = await this.post(this.ENDPOINTS.USER_PROFILE_PHOTO, formData);
        if (response.data && this.userId) {
            // Get the complete user profile after photo upload
            const profileResponse = await this.getUserProfile();
            if (profileResponse.data) {
                sendUpdate(this.userId, 'PROFILE_UPDATE', {
                    type: 'PHOTO_UPDATE',
                    photo_url: response.data.photo_url,
                    profile: profileResponse.data // Send full profile data
                });
            }
        }
        return response;
    }

    // Add method to handle incoming WebSocket updates
    private handleWebSocketUpdate = (data: any) => {
        switch (data.type) {
            case 'CART_UPDATE':
                // Trigger cart refresh
                this.get(this.ENDPOINTS.CART);
                break;
            case 'WISHLIST_UPDATE':
                // Trigger wishlist refresh
                this.get(this.ENDPOINTS.WISHLIST);
                break;
            case 'PROFILE_UPDATE':
                // Trigger profile refresh
                this.getUserProfile();
                break;
        }
    }

    // Admin methods
    async getAdminCategories(): Promise<ApiResponse<Category[]>> {
        return this.get(this.ENDPOINTS.ADMIN_CATEGORIES);
    }

    async addCategory(data: { name: string; description: string }): Promise<ApiResponse<Category>> {
        return this.post(this.ENDPOINTS.ADMIN_CATEGORIES, data);
    }

    async updateCategory(id: number, data: Partial<Category>): Promise<ApiResponse<Category>> {
        return this.put(this.ENDPOINTS.ADMIN_CATEGORY(id), data);
    }

    async deleteCategory(id: number): Promise<ApiResponse<void>> {
        return this.delete(this.ENDPOINTS.ADMIN_CATEGORY(id));
    }

    // Notification methods
    async getNotifications(): Promise<ApiResponse<any>> {
        return this.get(this.ENDPOINTS.NOTIFICATIONS);
    }

    async markNotificationAsRead(id: number): Promise<ApiResponse<void>> {
        return this.post(this.ENDPOINTS.NOTIFICATION_READ(id), {});
    }

    // Helper methods
    getFullImageUrl(imageUrl: string | undefined): string {
        if (!imageUrl) return '';
        return imageUrl.startsWith('http') ? imageUrl : `${API_CONFIG.BASE_URL}/${imageUrl}`;
    }

    // Password reset methods
    async requestPasswordReset(emailOrPhone: string): Promise<ApiResponse<{ message: string }>> {
        return this.post(this.ENDPOINTS.FORGOT_PASSWORD, { emailOrPhone });
    }

    async verifyResetOtp(emailOrPhone: string, otp: string): Promise<ApiResponse<{ message: string }>> {
        return this.post(this.ENDPOINTS.VERIFY_RESET_OTP, { emailOrPhone, otp });
    }

    async resetPassword(emailOrPhone: string, otp: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
        return this.post(this.ENDPOINTS.RESET_PASSWORD, { emailOrPhone, otp, newPassword });
    }

    // Coupon methods
    async validateCoupon(couponCode: string, cartItems: any[]): Promise<ApiResponse<any>> {
        return this.post(this.ENDPOINTS.VALIDATE_COUPON, { couponCode, cartItems });
    }

    async applyCoupon(couponCode: string, cartItems: any[]): Promise<ApiResponse<any>> {
        return this.post(this.ENDPOINTS.APPLY_COUPON, { couponCode, cartItems });
    }

    async getCoupons(): Promise<ApiResponse<any[]>> {
        return this.get(this.ENDPOINTS.GET_COUPONS);
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

    // Cart and Order methods
    async getCartItems(): Promise<any[]> {
        const response = await this.get<any[]>(this.ENDPOINTS.CART);
        return response.data || [];
    }

    async getPaymentMethods(): Promise<any[]> {
        const response = await this.get<any[]>(this.ENDPOINTS.PAYMENT_METHODS);
        return response.data || [];
    }

    async createOrder(orderData: any): Promise<any> {
        const response = await this.post(this.ENDPOINTS.ORDERS, orderData);
        return response.data;
    }

    // OTP methods
    async requestSignupOTP(email: string): Promise<ApiResponse<{ message: string }>> {
        return this.post(this.ENDPOINTS.REQUEST_SIGNUP_OTP, { email });
    }

    async verifySignupOTP(email: string, otp: string, name: string, password: string): Promise<ApiResponse<AuthResponse>> {
        return this.post(this.ENDPOINTS.VERIFY_SIGNUP_OTP, { email, otp, name, password });
    }

    // Google Sign In
    async googleSignIn(idToken: string): Promise<ApiResponse<GoogleAuthResponse>> {
        return this.post('/auth/google', { idToken });
    }
}

// Export both the base URL and endpoints
export const ENDPOINTS = API_CONFIG.ENDPOINTS; 