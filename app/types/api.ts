import { API_CONFIG } from '../config/api';

export interface ApiResponse<T> {
    data?: T | null;
    error?: string;
    needsVerification?: boolean;
    details?: any;
}

export interface ProductData {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    image_url: string;
    stock_quantity?: number;
    [key: string]: any;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        name?: string;
        email?: string;
        photo_url?: string;
    };
}

export interface GoogleAuthResponse extends AuthResponse {
    user: {
        id: string;
        name: string;
        email: string;
        photo_url?: string;
    };
}

export interface Category {
    id: number;
    name: string;
    description: string;
    image_url: string;
    parent_id: number | null;
    parent_name?: string;
    product_count: number;
}

export interface Address {
    id: number;
    user_id: number;
    full_name: string;
    phone_number: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    address_type: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface UserProfile {
    name: string;
    email: string;
    phone: string;
    photo_url: string;
    created_at: string;
    updated_at: string;
}

export interface ApiService {
    ENDPOINTS: typeof API_CONFIG.ENDPOINTS;
    get<T = any>(endpoint: string): Promise<ApiResponse<T>>;
    post<T = any>(endpoint: string, data: any): Promise<ApiResponse<T>>;
    put<T = any>(endpoint: string, data: any): Promise<ApiResponse<T>>;
    delete<T = any>(endpoint: string): Promise<ApiResponse<T>>;
    login: (email: string, password: string) => Promise<ApiResponse<AuthResponse>>;
    register: (name: string, email: string, password: string) => Promise<ApiResponse<AuthResponse>>;
    logout: () => Promise<ApiResponse<void>>;
    getUserDashboard: () => Promise<ApiResponse<any>>;
    getCategories: () => Promise<ApiResponse<Category[]>>;
    getCategoryDetails: <T>(id: number) => Promise<ApiResponse<T>>;
    testConnection: () => Promise<boolean>;
    getAddresses: () => Promise<Address[]>;
    addAddress: (address: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Address>;
    updateAddress: (id: number, address: Partial<Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<Address>;
    deleteAddress: (id: number) => Promise<void>;
    getUserProfile: () => Promise<ApiResponse<UserProfile>>;
    updateUserProfile: (data: Partial<UserProfile>) => Promise<ApiResponse<UserProfile>>;
    uploadProfilePhoto: (formData: FormData) => Promise<ApiResponse<{ photo_url: string }>>;
    getAdminCategories: () => Promise<ApiResponse<Category[]>>;
    addCategory: (data: { name: string; description: string }) => Promise<ApiResponse<Category>>;
    updateCategory: (id: number, data: Partial<Category>) => Promise<ApiResponse<Category>>;
    deleteCategory: (id: number) => Promise<ApiResponse<void>>;
    getAdminProducts: (queryParams?: string) => Promise<ApiResponse<ProductData[]>>;
    addProduct: (formData: FormData) => Promise<ApiResponse<ProductData>>;
    updateProduct: (id: number, formData: FormData) => Promise<ApiResponse<ProductData>>;
    deleteProduct: (id: number) => Promise<ApiResponse<void>>;
    googleSignIn: (idToken: string) => Promise<ApiResponse<GoogleAuthResponse>>;
    getNotifications: () => Promise<ApiResponse<any>>;
    markNotificationAsRead: (id: number) => Promise<ApiResponse<void>>;
    getFullImageUrl: (imageUrl: string | undefined) => string;
    requestPasswordReset: (emailOrPhone: string) => Promise<ApiResponse<{ message: string }>>;
    verifyResetOtp: (emailOrPhone: string, otp: string) => Promise<ApiResponse<{ message: string }>>;
    resetPassword: (emailOrPhone: string, otp: string, newPassword: string) => Promise<ApiResponse<{ message: string }>>;
    validateCoupon: (couponCode: string, cartItems: any[]) => Promise<ApiResponse<any>>;
    applyCoupon: (couponCode: string, cartItems: any[]) => Promise<ApiResponse<any>>;
    getCoupons: () => Promise<ApiResponse<any[]>>;
    createCoupon: (couponData: any) => Promise<ApiResponse<any>>;
    updateCoupon: (id: number, couponData: any) => Promise<ApiResponse<any>>;
    deleteCoupon: (id: number) => Promise<ApiResponse<void>>;
    getCartItems: () => Promise<any[]>;
    getPaymentMethods: () => Promise<any[]>;
    createOrder: (orderData: any) => Promise<any>;
    requestSignupOTP: (email: string) => Promise<ApiResponse<{ message: string }>>;
    verifySignupOTP: (email: string, otp: string, name: string, password: string) => Promise<ApiResponse<AuthResponse>>;
} 