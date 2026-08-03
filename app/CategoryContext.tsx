import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Image } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { apiService } from './services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCategoryImage } from './constants/categoryImages';

const normalizeCategoryName = (name: string): string => {
    if (!name) return '';
    return name.trim();
};

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
    fetchCategories: (forceRefresh?: boolean) => Promise<void>;
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

    const prefetchImages = React.useCallback((catList: Category[]) => {
        try {
            const urls: string[] = [];
            catList.forEach(cat => {
                if (cat.image_url) {
                    urls.push(apiService.getFullImageUrl(cat.image_url));
                }
                const tileUrl = getCategoryImage(normalizeCategoryName(cat.name), 'tile');
                if (tileUrl) {
                    urls.push(tileUrl);
                }
            });
            const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
            if (uniqueUrls.length > 0) {
                ExpoImage.prefetch(uniqueUrls);
            }
        } catch (e) {
            // Silently ignore prefetch errors
        }
    }, []);

    const loadCachedCategories = React.useCallback(async () => {
        try {
            const cachedData = await AsyncStorage.getItem(CATEGORIES_CACHE_KEY);
            if (cachedData) {
                const { categories: cachedCategories, timestamp } = JSON.parse(cachedData);
                if (Array.isArray(cachedCategories) && cachedCategories.length > 0) {
                    setCategories(cachedCategories);
                    setLastFetchTime(timestamp || Date.now());
                    setLoading(false); // Instantly display category images!
                    prefetchImages(cachedCategories);
                    return true;
                }
            }
            return false;
        } catch (err) {
            console.error('Error loading cached categories:', err);
            return false;
        }
    }, [prefetchImages]);

    const fetchCategories = React.useCallback(async (forceRefresh: boolean = false) => {
        const now = Date.now();
        if (!forceRefresh && now - lastFetchTime < CACHE_EXPIRY_TIME && categories.length > 0) {
            return;
        }

        try {
            if (categories.length === 0) {
                setLoading(true);
            }
            const response = await apiService.getCategories();

            if (response.error) {
                throw new Error(response.error);
            }
            const fetchedCategories = response.data as Category[] || [];

            if (fetchedCategories.length > 0) {
                setCategories(fetchedCategories);
                prefetchImages(fetchedCategories);
                await AsyncStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify({
                    categories: fetchedCategories,
                    timestamp: now
                }));
            }
            setLastFetchTime(now);
            setError(null);
        } catch (err) {
            console.error('Error fetching categories:', err);
            if (categories.length === 0) {
                setError(err instanceof Error ? err.message : 'Failed to fetch categories');
            }
        } finally {
            setLoading(false);
        }
    }, [categories.length, lastFetchTime, prefetchImages]);

    // Initial load from cache and fetch
    useEffect(() => {
        const initializeCategories = async () => {
            const loadedFromCache = await loadCachedCategories();
            // Fetch fresh categories silently in background
            fetchCategories(true);
        };
        initializeCategories();
    }, [loadCachedCategories, fetchCategories]);

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

    const value = useMemo(() => ({
        categories,
        mainCategories,
        subCategories,
        loading,
        error,
        fetchCategories,
        getCategoryById,
        getSubcategories,
    }), [categories, mainCategories, subCategories, loading, error, fetchCategories, getCategoryById, getSubcategories]);

    return (
        <CategoryContext.Provider value={value}>
            {children}
        </CategoryContext.Provider>
    );
}

export function useCategories() {
    const context = useContext(CategoryContext);
    if (context === undefined) {
        // Return default values instead of throwing to prevent crashes
        console.warn('useCategories must be used within a CategoryProvider, using defaults');
        return {
            categories: [],
            mainCategories: [],
            subCategories: {},
            loading: false,
            error: null,
            fetchCategories: async () => { },
            getCategoryById: () => undefined,
            getSubcategories: () => [],
        };
    }
    return context;
} 