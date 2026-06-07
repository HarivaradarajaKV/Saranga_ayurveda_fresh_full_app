import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './services/api';
import { authEvents } from './services/authEvents';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  image_url2?: string;
  image_url3?: string;
  usage_instructions?: string;
  size?: string;
  benefits?: string;
  ingredients?: string;
  product_details?: string;
  stock_quantity: number;
  created_at: string;
  offer_percentage?: number;
}

interface WishlistContextType {
  wishlist: Product[];
  setWishlist: (newItems: Product[]) => void;
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: number) => void;
  isInWishlist: (productId: number) => boolean;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

interface WishlistProviderProps {
  children: ReactNode;
}

const WishlistProvider: React.FC<WishlistProviderProps> = ({ children }) => {
  const [items, setItems] = useState<Product[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Check auth token and update userId
  useEffect(() => {
    const checkAuthToken = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          const tokenParts = token.replace('Bearer ', '').split('.');
          if (tokenParts.length === 3) {
            const payload = tokenParts[1];
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
            const decodedToken = JSON.parse(atob(paddedBase64));
            setUserId(decodedToken.id?.toString() || null);
          } else {
            setUserId(null);
            setItems([]); // Clear items when token is invalid
          }
        } else {
          setUserId(null);
          setItems([]); // Clear items when no token is present
        }
      } catch (error) {
        console.error('Error checking auth token:', error);
        setUserId(null);
        setItems([]); // Clear items on error
      }
    };

    checkAuthToken();
    
    // Subscribe to real-time auth events
    const unsubscribe = authEvents.subscribe(checkAuthToken);
    
    // Check auth token every 5 seconds
    const interval = setInterval(checkAuthToken, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const setWishlist = (newItems: Product[]) => {
    setItems(newItems);
  };

  // Load wishlist items from backend when userId changes
  useEffect(() => {
    const loadWishlistItems = async () => {
      try {
        if (!userId) {
          setItems([]);
          return;
        }

        // Get wishlist items from backend
        const response = await apiService.get(apiService.ENDPOINTS.WISHLIST);
        if (response.data) {
          // Transform the backend response to match our Product interface
          const transformedItems = await Promise.all(response.data.map(async (item: any) => {
            const productResponse = await apiService.get(`/products/${item.product_id}`);
            return {
              id: Number(item.product_id),
              name: productResponse.data.name,
              description: productResponse.data.description || '',
              price: Number(productResponse.data.price),
              category: productResponse.data.category || 'Default Category',
              image_url: productResponse.data.image_url,
              stock_quantity: Number(productResponse.data.stock_quantity) || 0,
              offer_percentage: Number(productResponse.data.offer_percentage) || 0,
            };
          }));
          setItems(transformedItems);
        } else {
          setItems([]);
        }
      } catch (error) {
        console.error('Error loading wishlist items:', error);
        // Handle error appropriately
      }
    };
    loadWishlistItems();
  }, [userId]);

  const addToWishlist = async (product: Product) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token || !userId) {
        throw new Error('User not authenticated');
      }

      // Check if already in wishlist
      if (items.some(item => item.id === product.id)) {
        return;
      }

      // 1. Optimistic Update (Immediate state change)
      setItems(prev => {
        const newItems = [...prev, product];
        AsyncStorage.setItem(`wishlist_items_${userId}`, JSON.stringify(newItems))
          .catch(error => console.error('Error saving to storage:', error));
        return newItems;
      });

      // 2. Perform API call in background
      apiService.post(apiService.ENDPOINTS.WISHLIST, {
        product_id: product.id
      }).then(response => {
        if (response.error && response.error !== 'Item already in wishlist') {
          throw new Error(response.error);
        }
      }).catch(err => {
        console.error('Error adding to wishlist backend:', err);
        // Revert on error
        setItems(prev => {
          const revertedItems = prev.filter(item => item.id !== product.id);
          AsyncStorage.setItem(`wishlist_items_${userId}`, JSON.stringify(revertedItems))
            .catch(error => console.error('Error saving to storage:', error));
          return revertedItems;
        });
        Alert.alert('Error', 'Failed to add item to wishlist. Please try again.');
      });
      
    } catch (error: any) {
      console.error('Error adding to wishlist:', error);
      throw error; // Re-throw to handle in the UI
    }
  };

  const removeFromWishlist = async (productId: number) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token || !userId) {
        console.error('User not authenticated');
        return;
      }

      const originalItems = [...items];
      const itemToRemove = items.find(item => item.id === productId);

      if (!itemToRemove) return;

      // 1. Optimistic Update (Immediate state change)
      setItems(prev => {
        const newItems = prev.filter(item => item.id !== productId);
        AsyncStorage.setItem(`wishlist_items_${userId}`, JSON.stringify(newItems))
          .catch(error => console.error('Error saving to storage:', error));
        return newItems;
      });

      // 2. Perform API call in background
      apiService.delete(apiService.ENDPOINTS.WISHLIST_ITEM(productId)).then(response => {
        if (response.error) {
          throw new Error(response.error);
        }
      }).catch(err => {
        console.error('Error removing from wishlist backend:', err);
        // Revert on error
        setItems(originalItems);
        AsyncStorage.setItem(`wishlist_items_${userId}`, JSON.stringify(originalItems))
          .catch(error => console.error('Error saving to storage:', error));
        Alert.alert('Error', 'Failed to remove item from wishlist. Please try again.');
      });

    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  const isInWishlist = (productId: number) => {
    return items.some(item => item.id === productId);
  };

  const clearWishlist = async () => {
    try {
      if (!userId) return;
      
      // Clear all items from backend
      for (const item of items) {
        await apiService.delete(apiService.ENDPOINTS.WISHLIST_ITEM(item.id))
          .catch(error => console.error('Error removing item:', error));
      }

      // Clear local storage and state
      await AsyncStorage.removeItem(`wishlist_items_${userId}`);
      setItems([]);
    } catch (error) {
      console.error('Error clearing wishlist:', error);
    }
  };

  return (
    <WishlistContext.Provider value={{
      wishlist: items,
      setWishlist,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      clearWishlist
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    // Return default values instead of throwing to prevent crashes
    console.warn('useWishlist must be used within a WishlistProvider, using defaults');
    return {
      wishlist: [],
      setWishlist: () => {},
      addToWishlist: () => {},
      removeFromWishlist: () => {},
      isInWishlist: () => false,
      clearWishlist: () => {},
    };
  }
  return context;
};

export default WishlistProvider;