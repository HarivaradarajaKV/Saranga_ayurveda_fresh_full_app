import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from './services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Category {
    id: number;
    name: string;
    description: string;
    image_url: string;
    parent_id: number | null;
    parent_name?: string;
    product_count: number;
}

interface CategoryContextType {
    categories: Category[];
    mainCategories: Category[];
    subCategories: { [key: number]: Category[] };
    loading: boolean;
    error: string | null;
    fetchCategories: () => Promise<void>;
    getCategoryById: (id: number) => Category | undefined;
    getSubcategories: (parentId: number) => Category[];
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const checkAuth = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            setIsAuthenticated(!!token);
        } catch (err) {
            console.error('Error checking auth status:', err);
            setIsAuthenticated(false);
        }
    };

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const response = await apiService.getCategories();
            if (response.error) {
                throw new Error(response.error);
            }
            setCategories(response.data as Category[] || []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch categories');
            setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    // Check authentication status initially
    useEffect(() => {
        checkAuth();
    }, []);

    // Fetch categories on mount and periodically
    useEffect(() => {
        fetchCategories();
        const refreshInterval = setInterval(fetchCategories, 5000);
        return () => clearInterval(refreshInterval);
    }, []);

    const mainCategories = categories.filter(cat => !cat.parent_id);
    const subCategories = categories.reduce((acc, cat) => {
        if (cat.parent_id) {
            if (!acc[cat.parent_id]) {
                acc[cat.parent_id] = [];
            }
            acc[cat.parent_id].push(cat);
        }
        return acc;
    }, {} as { [key: number]: Category[] });

    const getCategoryById = (id: number) => categories.find(cat => cat.id === id);
    const getSubcategories = (parentId: number) => subCategories[parentId] || [];

    const value = {
        categories,
        mainCategories,
        subCategories,
        loading,
        error,
        fetchCategories,
        getCategoryById,
        getSubcategories,
    };

    return (
        <CategoryContext.Provider value={value}>
            {children}
        </CategoryContext.Provider>
    );
}

export function useCategories() {
    const context = useContext(CategoryContext);
    if (context === undefined) {
        throw new Error('useCategories must be used within a CategoryProvider');
    }
    return context;
} 