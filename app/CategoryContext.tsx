import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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

const CATEGORIES_CACHE_KEY = 'categories_cache';
const CACHE_EXPIRY_TIME = 1000 * 60 * 5; // 5 minutes

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastFetchTime, setLastFetchTime] = useState<number>(0);

    const loadCachedCategories = async () => {
        try {
            const cachedData = await AsyncStorage.getItem(CATEGORIES_CACHE_KEY);
            if (cachedData) {
                const { categories: cachedCategories, timestamp } = JSON.parse(cachedData);
                const now = Date.now();
                if (now - timestamp < CACHE_EXPIRY_TIME) {
                    setCategories(cachedCategories);
                    setLastFetchTime(timestamp);
                    setLoading(false);
                    return true;
                }
            }
            return false;
        } catch (err) {
            console.error('Error loading cached categories:', err);
            return false;
        }
    };

    const fetchCategories = async () => {
        const now = Date.now();
        // Don't fetch if we've fetched recently (within last 5 minutes)
        if (now - lastFetchTime < CACHE_EXPIRY_TIME) {
            return;
        }

        try {
            setLoading(true);
            const response = await apiService.getCategories();
            
            if (response.error) {
                throw new Error(response.error);
            }
            const fetchedCategories = response.data as Category[] || [];
            
            // If no categories were fetched, try to fetch from cache or show error
            if (fetchedCategories.length === 0) {
                // Try to load from cache as fallback
                const cachedData = await AsyncStorage.getItem(CATEGORIES_CACHE_KEY);
                if (cachedData) {
                    const { categories: cachedCategories } = JSON.parse(cachedData);
                    setCategories(cachedCategories);
                } else {
                    throw new Error('No categories available and no cached data found');
                }
            } else {
                setCategories(fetchedCategories);
            }
            setLastFetchTime(now);
            setError(null);

            // Cache the fetched categories
            await AsyncStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify({
                categories: fetchedCategories,
                timestamp: now
            }));
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch categories');
        } finally {
            setLoading(false);
        }
    };

    // Initial load from cache and fetch
    useEffect(() => {
        const initializeCategories = async () => {
            const hasCachedData = await loadCachedCategories();
            if (!hasCachedData) {
                await fetchCategories();
            }
        };
        initializeCategories();
    }, []);

    // Memoize derived category data
    const mainCategories = useMemo(() => 
        categories.filter(cat => !cat.parent_id),
        [categories]
    );

    const subCategories = useMemo(() => 
        categories.reduce((acc, cat) => {
            if (cat.parent_id) {
                if (!acc[cat.parent_id]) {
                    acc[cat.parent_id] = [];
                }
                acc[cat.parent_id].push(cat);
            }
            return acc;
        }, {} as { [key: number]: Category[] }),
        [categories]
    );

    const getCategoryById = useMemo(() => 
        (id: number) => categories.find(cat => cat.id === id),
        [categories]
    );

    const getSubcategories = useMemo(() => 
        (parentId: number) => subCategories[parentId] || [],
        [subCategories]
    );

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