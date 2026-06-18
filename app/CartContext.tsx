import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './services/api';
import { authEvents } from './services/authEvents';

interface FAQ {
  question: string;
  answer: string;
}

interface RelatedProduct extends Product {}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  image_url2?: string;
  image_url3?: string;
  usage_instructions?: string | string[];
  size?: string;
  benefits?: string | string[];
  ingredients?: string | string[];
  product_details?: string;
  stock_quantity: number;
  created_at: string;
  offer_percentage: number;
  original_price?: number;
  discount_percentage?: number;
  rating?: number;
  review_count?: number;
  shades?: string[];
  sizes?: string[];
  frequently_bought_together?: RelatedProduct[];
  faqs?: FAQ[];
}

export interface CartItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock_quantity: number;
  created_at: string;
  offer_percentage: number;
  variant?: string;
  quantity: number;
  cartId?: number;
  usage_instructions?: string | string[];
  benefits?: string | string[];
  ingredients?: string | string[];
  shades?: string[];
  sizes?: string[];
  size?: string;
  discounted_price: number;
  // Combo offer fields
  is_from_combo?: boolean;
  combo_id?: number;
  combo_discount_type?: 'percentage' | 'fixed';
  combo_discount_value?: number;
  combo_original_price?: number; // Original price before combo discount
  combo_discounted_price?: number; // Price after combo discount
}

interface CartContextType {
  items: CartItem[];
  selectedItems: number[];
  addItem: (product: Product, variant?: string, comboInfo?: { comboId: number; comboDiscountType: 'percentage' | 'fixed'; comboDiscountValue: number; comboTotalPrice: number; comboDiscountedPrice: number; itemOriginalPrice: number }, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, increment: boolean) => void;
  getItemCount: () => number;
  getTotal: () => number;
  clearCart: () => void;
  toggleItemSelection: (productId: number) => void;
  setSelectedItems: (items: number[]) => void;
  getSelectedItems: () => CartItem[];
  getCartItems: () => CartItem[];
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
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

  // Load cart items from backend when userId changes
  useEffect(() => {
    const loadCartItems = async () => {
      try {
        if (!userId) {
          setItems([]);
          return;
        }

        // Get cart items from backend
        const response = await apiService.get(apiService.ENDPOINTS.CART);
        if (response.data) {
          // Transform the backend response to match our CartItem interface
          const transformedItems = await Promise.all(response.data.map(async (item: any) => {
            // Use price from cart response first (backend already includes it)
            const cartPrice = Number(item.price) || 0;
            const cartOfferPercentage = Number(item.offer_percentage) || 0;
            
            // Try to fetch full product details, but use cart data if fetch fails
            let productData: any = null;
            try {
              const productResponse = await apiService.get(`/products/${item.product_id}`);
              productData = productResponse.data;
            } catch (error) {
              console.warn('Could not fetch product details, using cart data:', error);
            }
            
            // Use price from cart response (from backend), fallback to product data if available
            const finalPrice = cartPrice || (productData ? Number(productData.price) || 0 : 0);
            // Use offer_percentage from cart response first, then product data
            const offerPercentage = cartOfferPercentage || (productData ? Number(productData.offer_percentage) || 0 : 0);
            
            // Try to load combo info from AsyncStorage if available
            let comboInfo: any = null;
            try {
              const storedCartItems = await AsyncStorage.getItem(`cart_items_${userId}`);
              if (storedCartItems) {
                const storedItems = JSON.parse(storedCartItems);
                const storedItem = storedItems.find((si: any) => 
                  si.id === Number(item.product_id) && si.variant === item.variant
                );
                if (storedItem?.is_from_combo) {
                  comboInfo = {
                    is_from_combo: storedItem.is_from_combo,
                    combo_id: storedItem.combo_id,
                    combo_discount_type: storedItem.combo_discount_type,
                    combo_discount_value: storedItem.combo_discount_value,
                    combo_original_price: storedItem.combo_original_price,
                    combo_discounted_price: storedItem.combo_discounted_price,
                  };
                }
              }
            } catch (error) {
              console.warn('Could not load combo info from storage:', error);
            }
            
            // Calculate discounted price - use combo price if available, otherwise normal discount
            let discountedPrice = finalPrice * (1 - offerPercentage / 100);
            if (comboInfo?.combo_discounted_price !== undefined) {
              discountedPrice = comboInfo.combo_discounted_price;
            }
            
            return {
              id: Number(item.product_id),
              cartId: Number(item.id),
              name: item.name || productData?.name || `Product ${item.product_id}`,
              description: productData?.description || '',
              price: finalPrice,
              category: productData?.category || 'Default Category',
              image_url: item.image_url || productData?.image_url || '',
              stock_quantity: productData ? Number(productData.stock_quantity) || 0 : 999,
              created_at: item.created_at || new Date().toISOString(),
              offer_percentage: offerPercentage,
              quantity: Number(item.quantity) || 1,
              variant: item.variant,
              usage_instructions: productData?.usage_instructions,
              benefits: productData?.benefits,
              ingredients: productData?.ingredients,
              shades: productData?.shades,
              sizes: productData?.sizes,
              discounted_price: discountedPrice,
              // Preserve combo info if available
              is_from_combo: comboInfo?.is_from_combo || false,
              combo_id: comboInfo?.combo_id,
              combo_discount_type: comboInfo?.combo_discount_type,
              combo_discount_value: comboInfo?.combo_discount_value,
              combo_original_price: comboInfo?.combo_original_price,
              combo_discounted_price: comboInfo?.combo_discounted_price,
            };
          }));
          setItems(transformedItems);
          setSelectedItems(transformedItems.filter(item => item.stock_quantity > 0).map(item => item.id));
          await AsyncStorage.setItem(`cart_items_${userId}`, JSON.stringify(transformedItems));
        } else {
          setItems([]);
          await AsyncStorage.removeItem(`cart_items_${userId}`);
        }
      } catch (error) {
        console.error('Error loading cart items:', error);
        // Handle error appropriately
      }
    };
    loadCartItems();
  }, [userId]);

  const addItem = async (product: Product, variant?: string, comboInfo?: { comboId: number; comboDiscountType: 'percentage' | 'fixed'; comboDiscountValue: number; comboTotalPrice: number; comboDiscountedPrice: number; itemOriginalPrice: number }, quantity: number = 1) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token || !userId) {
        console.error('User not authenticated');
        throw new Error('Authentication required');
      }

      console.log('Adding item to cart:', { productId: product.id, variant, price: product.price, quantity });
      console.log('Current cart items before adding:', items);

      // Check for existing item in the cart
      const existingItem = items.find(item => 
        item.id === product.id && item.variant === variant
      );

      if (existingItem) {
        console.log('Item already in cart, incrementing quantity. Existing item:', existingItem);
        const originalQuantity = existingItem.quantity;
        const maxAvailable = typeof existingItem.stock_quantity === 'number' ? existingItem.stock_quantity : 999;
        
        if (originalQuantity >= maxAvailable) {
          Alert.alert('Limit Reached', `You already have all available ${maxAvailable} items in your cart.`);
          return;
        }
        
        const newQuantity = Math.min(existingItem.quantity + quantity, maxAvailable);
        if (originalQuantity + quantity > maxAvailable) {
          Alert.alert('Stock Limit', `Only ${maxAvailable} units are available. Added ${maxAvailable - originalQuantity} more units to your cart.`);
        }
        
        // 1. Optimistic Update (Immediate state change)
        setItems(prevItems => {
          const newItems = prevItems.map(item =>
            item.id === product.id && item.variant === variant
              ? { ...item, quantity: newQuantity }
              : item
          );
          AsyncStorage.setItem(`cart_items_${userId}`, JSON.stringify(newItems))
            .catch(error => console.error('Error saving to storage:', error));
          return newItems;
        });

        // 2. Background API call
        apiService.put(apiService.ENDPOINTS.CART_ITEM(existingItem.cartId || 0), {
          quantity: newQuantity
        }).then(response => {
          if (response.error) {
            // Revert on error
            setItems(prevItems => {
              const revertedItems = prevItems.map(item =>
                item.id === product.id && item.variant === variant
                  ? { ...item, quantity: originalQuantity }
                  : item
              );
              AsyncStorage.setItem(`cart_items_${userId}`, JSON.stringify(revertedItems))
                .catch(error => console.error('Error saving to storage:', error));
              return revertedItems;
            });
            Alert.alert('Error', 'Failed to update quantity. Please try again.');
          }
        }).catch(err => {
          console.error('Error updating quantity:', err);
          // Revert
          setItems(prevItems => {
            const revertedItems = prevItems.map(item =>
              item.id === product.id && item.variant === variant
                ? { ...item, quantity: originalQuantity }
                : item
            );
            AsyncStorage.setItem(`cart_items_${userId}`, JSON.stringify(revertedItems))
              .catch(error => console.error('Error saving to storage:', error));
            return revertedItems;
          });
          Alert.alert('Error', 'Connection error. Failed to update quantity.');
        });
        return; // Exit the function to prevent adding again
      }

      // Define newItem after checking for existing items
      const productStock = typeof product.stock_quantity === 'number' ? product.stock_quantity : 999;
      if (productStock <= 0) {
        Alert.alert('Out of Stock', 'This product is out of stock.');
        return;
      }

      let initialQuantity = quantity;
      if (quantity > productStock) {
        initialQuantity = productStock;
        Alert.alert('Stock Limit', `Only ${productStock} units are available. Added ${productStock} units to your cart.`);
      }

      const itemPrice = typeof product.price === 'number' ? product.price : (parseFloat(String(product.price)) || 0);
      const itemOfferPercentage = typeof product.offer_percentage === 'number' ? product.offer_percentage : (parseFloat(String(product.offer_percentage)) || 0);
      
      // Calculate price based on whether it's from combo or normal
      let finalPrice = itemPrice;
      let finalDiscountedPrice = itemPrice * (1 - itemOfferPercentage / 100);
      
      // If this item is from a combo, apply combo discount proportionally
      if (comboInfo) {
        const { comboTotalPrice, comboDiscountedPrice: comboFinalPrice, itemOriginalPrice } = comboInfo;
        
        // Calculate proportional discount for this item
        // itemOriginalPrice is the total price for this item in the combo (price * quantity)
        // Item's share of total = itemOriginalPrice / comboTotalPrice
        // Item's total discounted price = comboFinalPrice * (itemOriginalPrice / comboTotalPrice)
        // Item's unit discounted price = (comboFinalPrice * (itemOriginalPrice / comboTotalPrice)) / itemQuantity
        if (comboTotalPrice > 0 && itemOriginalPrice > 0) {
          const itemProportion = itemOriginalPrice / comboTotalPrice;
          const itemTotalDiscountedPrice = comboFinalPrice * itemProportion;
          // Since we're adding items one by one, each unit gets the same discounted price
          // We need to calculate per-unit price from the total item price
          // Find quantity by dividing itemOriginalPrice by unit price
          const itemQuantityInCombo = itemOriginalPrice / itemPrice;
          finalPrice = itemPrice; // Store original unit price
          finalDiscountedPrice = itemTotalDiscountedPrice / itemQuantityInCombo; // Per-unit discounted price
        }
      }
      
      const tempCartId = -Date.now();
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: finalPrice,
        category: product.category || '',
        image_url: product.image_url || '',
        stock_quantity: typeof product.stock_quantity === 'number' ? product.stock_quantity : (parseInt(String(product.stock_quantity)) || 0),
        created_at: product.created_at || new Date().toISOString(),
        offer_percentage: itemOfferPercentage,
        quantity: initialQuantity,
        variant: variant,
        cartId: tempCartId, // Temporary cart ID
        usage_instructions: product.usage_instructions,
        benefits: product.benefits,
        ingredients: product.ingredients,
        shades: product.shades,
        sizes: product.sizes,
        discounted_price: finalDiscountedPrice,
        // Combo offer information
        is_from_combo: !!comboInfo,
        combo_id: comboInfo?.comboId,
        combo_discount_type: comboInfo?.comboDiscountType,
        combo_discount_value: comboInfo?.comboDiscountValue,
        combo_original_price: comboInfo ? itemPrice : undefined,
        combo_discounted_price: comboInfo ? finalDiscountedPrice : undefined,
      };

      // 1. Optimistic Update (Immediate state change)
      setItems(prevItems => {
        const updatedItems = [...prevItems, newItem];
        AsyncStorage.setItem(`cart_items_${userId}`, JSON.stringify(updatedItems))
          .catch(error => console.error('Error saving to storage:', error));
        return updatedItems;
      });
      setSelectedItems(prev => {
        if (!prev.includes(product.id)) {
          return [...prev, product.id];
        }
        return prev;
      });

      // 2. Perform API call in background
      apiService.post<{ id: number }>(apiService.ENDPOINTS.CART, {
        product_id: product.id,
        quantity: initialQuantity,
        variant: variant
      }).then(response => {
        if (response.error || !response.data || typeof response.data.id !== 'number') {
          throw new Error(response.error || 'Invalid response from server');
        }

        const realCartId = response.data.id;
        
        // Update temp cartId in state
        setItems(prevItems => {
          const updatedItems = prevItems.map(item =>
            item.id === product.id && item.variant === variant && item.cartId === tempCartId
              ? { ...item, cartId: realCartId }
              : item
          );
          AsyncStorage.setItem(`cart_items_${userId}`, JSON.stringify(updatedItems))
            .catch(error => console.error('Error saving to storage:', error));
          return updatedItems;
        });
      }).catch(err => {
        console.error('Error adding item to cart backend:', err);
        // Revert the optimistic add
        setItems(prevItems => {
          const revertedItems = prevItems.filter(item => !(item.id === product.id && item.variant === variant && item.cartId === tempCartId));
          AsyncStorage.setItem(`cart_items_${userId}`, JSON.stringify(revertedItems))
            .catch(error => console.error('Error saving to storage:', error));
          return revertedItems;
        });
        Alert.alert('Error', 'Failed to add item to cart. Please try again.');
      });

    } catch (error) {
      console.error('Error adding item to cart:', error);
      throw error;
    }
  };

  const removeItem = async (productId: number) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token || !userId) {
        console.error('User not authenticated');
        return;
      }

      // Find the cart item to get its cartId
      const cartItem = items.find(item => item.id === productId);
      if (!cartItem || !cartItem.cartId) {
        console.error('Cart item not found or missing cartId');
        return;
      }

      const originalItems = [...items];

      // 1. Optimistic Update (Immediate state change)
      setItems(prevItems => {
        const newItems = prevItems.filter(item => item.id !== productId);
        AsyncStorage.setItem(`cart_items_${userId}`, JSON.stringify(newItems))
          .catch(error => console.error('Error saving to storage:', error));
        return newItems;
      });

      // 2. Perform API call in background
      apiService.delete(apiService.ENDPOINTS.CART_ITEM(cartItem.cartId)).then(response => {
        if (response.error) {
          throw new Error(response.error);
        }
      }).catch(err => {
        console.error('Error removing item:', err);
        // Revert on error
        setItems(originalItems);
        AsyncStorage.setItem(`cart_items_${userId}`, JSON.stringify(originalItems))
          .catch(e => console.error('Error saving to storage:', e));
        Alert.alert('Error', 'Failed to remove item. Please try again.');
      });

    } catch (error) {
      console.error('Error removing item from cart:', error);
    }
  };

  const updateQuantity = async (productId: number, increment: boolean) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token || !userId) {
        console.error('User not authenticated');
        return;
      }

      const cartItem = items.find(item => item.id === productId);
      if (!cartItem?.cartId) {
        console.error('Cart item not found or missing cartId');
        return;
      }

      const originalQuantity = cartItem.quantity;
      const maxAvailable = typeof cartItem.stock_quantity === 'number' ? cartItem.stock_quantity : 999;
      
      if (increment && originalQuantity >= maxAvailable) {
        Alert.alert('Limit Reached', `Only ${maxAvailable} units available in stock.`);
        return;
      }

      const newQuantity = increment ? Math.min(cartItem.quantity + 1, maxAvailable) : Math.max(1, cartItem.quantity - 1);

      if (newQuantity === originalQuantity) return;

      // 1. Optimistic Update (Immediate state change)
      setItems(prevItems => {
        const newItems = prevItems.map(item =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        );
        AsyncStorage.setItem(`cart_items_${userId}`, JSON.stringify(newItems))
          .catch(error => console.error('Error saving to storage:', error));
        return newItems;
      });

      // 2. Perform API call in background
      apiService.put(apiService.ENDPOINTS.CART_ITEM(cartItem.cartId), {
        quantity: newQuantity
      }).then(response => {
        if (response.error) {
          // Revert on error
          setItems(prevItems => {
            const revertedItems = prevItems.map(item =>
              item.id === productId ? { ...item, quantity: originalQuantity } : item
            );
            AsyncStorage.setItem(`cart_items_${userId}`, JSON.stringify(revertedItems))
              .catch(e => console.error('Error saving to storage:', e));
            return revertedItems;
          });
          Alert.alert('Error', 'Failed to update quantity. Please try again.');
        }
      }).catch(err => {
        console.error('Error updating quantity:', err);
        // Revert on error
        setItems(prevItems => {
          const revertedItems = prevItems.map(item =>
            item.id === productId ? { ...item, quantity: originalQuantity } : item
          );
          AsyncStorage.setItem(`cart_items_${userId}`, JSON.stringify(revertedItems))
            .catch(e => console.error('Error saving to storage:', e));
          return revertedItems;
        });
        Alert.alert('Error', 'Connection error. Failed to update quantity.');
      });

    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const getItemCount = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotal = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const clearCart = async () => {
    try {
      if (!userId) return;
      
      try {
        // Clear all items using the cart clear endpoint
        await apiService.delete('/cart/clear');
      } catch (error) {
        console.error('Error clearing cart in backend:', error);
        // Continue with local cart clearing even if backend fails
      }

      // Clear local storage and state regardless of backend success
      try {
        await AsyncStorage.removeItem(`cart_items_${userId}`);
      } catch (storageError) {
        console.error('Error clearing local storage:', storageError);
      }
      
      // Always clear the local state
      setItems([]);
    } catch (error) {
      console.error('Error in clearCart:', error);
      // Don't throw the error, just log it
    }
  };

  const toggleItemSelection = (productId: number) => {
    setSelectedItems(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const getSelectedItems = () => {
    return items.filter(item => selectedItems.includes(item.id));
  };

  const getCartItems = () => {
    return items;
  };

  // Update useEffect to handle selected items when items change
  useEffect(() => {
    if (items.length === 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(prev => prev.filter(id => items.some(item => item.id === id)));
    }
  }, [items]);

  return (
    <CartContext.Provider value={{
      items,
      selectedItems,
      addItem,
      removeItem,
      updateQuantity,
      getItemCount,
      getTotal,
      clearCart,
      toggleItemSelection,
      setSelectedItems,
      getSelectedItems,
      getCartItems
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    // Return default values instead of throwing to prevent crashes
    console.warn('useCart must be used within a CartProvider, using defaults');
    return {
      items: [],
      selectedItems: [],
      addItem: () => {},
      removeItem: () => {},
      updateQuantity: () => {},
      getItemCount: () => 0,
      getTotal: () => 0,
      clearCart: () => {},
      toggleItemSelection: () => {},
      setSelectedItems: () => {},
      getSelectedItems: () => [],
      getCartItems: () => [],
    };
  }
  return context;
};

export default CartProvider; 