import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
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

const applyComboDiscounts = (cartItems: CartItem[], combosList: any[]): CartItem[] => {
  if (!combosList || combosList.length === 0) return cartItems;

  // Clone items and add fields for tracking
  let itemsToMatch = cartItems.map(item => ({
    ...item,
    unmatchedQty: item.quantity || 1,
    matchedDetails: [] as { qty: number; ratio: number; comboId: number; discountType: string; discountValue: number }[]
  }));

  // Sort combos by items count descending so we try matching larger combos first
  const sortedCombos = [...combosList].sort((a, b) => {
    const aItems = a.products || a.items || [];
    const bItems = b.products || b.items || [];
    return bItems.length - aItems.length;
  });

  for (const combo of sortedCombos) {
    const comboItems = combo.products || combo.items || [];
    if (comboItems.length === 0) continue;

    const originalPrice = parseFloat(combo.subtotal || combo.original_price || 0);
    const comboPrice = parseFloat(combo.total || combo.combo_price || combo.price || 0);
    if (originalPrice <= 0) continue;
    const ratio = comboPrice / originalPrice;

    // Try to consume items for this combo match as many times as possible
    while (true) {
      let canForm = true;
      for (const ci of comboItems) {
        const pid = ci.product_id || ci.id;
        const reqQty = ci.quantity || 1;
        const cartItem = itemsToMatch.find(i => i.id === pid);
        if (!cartItem || cartItem.unmatchedQty < reqQty) {
          canForm = false;
          break;
        }
      }

      if (!canForm) break;

      // Consume the products for this combo match
      for (const ci of comboItems) {
        const pid = ci.product_id || ci.id;
        const reqQty = ci.quantity || 1;
        const cartItem = itemsToMatch.find(i => i.id === pid);
        if (cartItem) {
          cartItem.unmatchedQty -= reqQty;
          cartItem.matchedDetails.push({ 
            qty: reqQty, 
            ratio: ratio,
            comboId: combo.id,
            discountType: combo.discount_type,
            discountValue: Number(combo.discount_value || 0)
          });
        }
      }
    }
  }

  // Calculate the average unit price for each item based on matched / unmatched portions
  return itemsToMatch.map(item => {
    const totalQty = item.quantity || 1;
    const matchedQty = totalQty - item.unmatchedQty;
    
    if (matchedQty > 0) {
      const originalUnitPrice = parseFloat(String(item.price || 0));
      const offer = parseFloat(String(item.offer_percentage || 0));
      const normalUnitPrice = originalUnitPrice * (1 - offer / 100);

      // Sum matched costs
      let totalMatchedCost = 0;
      for (const match of item.matchedDetails) {
        totalMatchedCost += match.qty * originalUnitPrice * match.ratio;
      }
      
      // Add unmatched cost
      const totalUnmatchedCost = item.unmatchedQty * normalUnitPrice;
      const totalCost = totalMatchedCost + totalUnmatchedCost;
      const finalUnitPrice = totalCost / totalQty;

      // Get last combo matched info for details display
      const lastMatch = item.matchedDetails[item.matchedDetails.length - 1];

      return {
        ...item,
        is_from_combo: true,
        combo_id: lastMatch.comboId,
        combo_discount_type: lastMatch.discountType as any,
        combo_discount_value: lastMatch.discountValue,
        combo_original_price: originalUnitPrice,
        combo_discounted_price: finalUnitPrice,
        discounted_price: finalUnitPrice
      };
    }

    // Otherwise, normal unit discount
    const originalUnitPrice = parseFloat(String(item.price || 0));
    const offer = parseFloat(String(item.offer_percentage || 0));
    const normalUnitPrice = originalUnitPrice * (1 - offer / 100);

    return {
      ...item,
      is_from_combo: false,
      combo_id: undefined,
      combo_discount_type: undefined,
      combo_discount_value: undefined,
      combo_original_price: undefined,
      combo_discounted_price: undefined,
      discounted_price: normalUnitPrice
    };
  });
};

const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [combos, setCombos] = useState<any[]>([]);

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

  // Fetch combos list whenever userId changes
  useEffect(() => {
    const fetchCombosList = async () => {
      try {
        const response = await apiService.getCombos();
        if (response.data) {
          setCombos(response.data);
        }
      } catch (error) {
        console.error('Error fetching combos list:', error);
      }
    };
    if (userId) fetchCombosList();
  }, [userId]);

  // Helper to update items state with dynamic discounts and persist to storage
  const setItemsWithDiscounts = (newItems: CartItem[]) => {
    const discounted = applyComboDiscounts(newItems, combos);
    setItems(discounted);
    AsyncStorage.setItem(`cart_items_${userId}`, JSON.stringify(discounted))
      .catch(error => console.error('Error saving to storage:', error));
  };

  // Load cart items from backend when userId changes
  useEffect(() => {
    const loadCartItems = async () => {
      try {
        if (!userId) {
          setItems([]);
          return;
        }

        // Get cart items and combos in parallel
        const [response, combosResponse] = await Promise.all([
          apiService.get(apiService.ENDPOINTS.CART),
          apiService.getCombos().catch(() => ({ data: [] }))
        ]);
        
        const combosList = combosResponse.data || [];
        setCombos(combosList);

        if (response.data) {
          // Transform the backend response to match our CartItem interface
          const transformedItems = await Promise.all(response.data.map(async (item: any) => {
            const cartPrice = Number(item.price) || 0;
            const cartOfferPercentage = Number(item.offer_percentage) || 0;
            
            let productData: any = null;
            try {
              const productResponse = await apiService.get(`/products/${item.product_id}`);
              productData = productResponse.data;
            } catch (error) {
              console.warn('Could not fetch product details, using cart data:', error);
            }
            
            const finalPrice = cartPrice || (productData ? Number(productData.price) || 0 : 0);
            const offerPercentage = cartOfferPercentage || (productData ? Number(productData.offer_percentage) || 0 : 0);
            const discountedPrice = finalPrice * (1 - offerPercentage / 100);
            
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
              is_from_combo: false
            };
          }));

          const discountedItems = applyComboDiscounts(transformedItems, combosList);
          setItems(discountedItems);
          setSelectedItems(discountedItems.filter(item => item.stock_quantity > 0).map(item => item.id));
          await AsyncStorage.setItem(`cart_items_${userId}`, JSON.stringify(discountedItems));
        } else {
          setItems([]);
          await AsyncStorage.removeItem(`cart_items_${userId}`);
        }
      } catch (error) {
        console.error('Error loading cart items:', error);
      }
    };
    loadCartItems();
  }, [userId]);

  const addItem = async (product: Product, variant?: string, comboInfo?: { comboId: number; comboDiscountType: 'percentage' | 'fixed'; comboDiscountValue: number; comboTotalPrice: number; comboDiscountedPrice: number; itemOriginalPrice: number }, quantity: number = 1) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token || !userId) {
        router.push('/auth/login');
        return;
      }

      const existingItem = items.find(item => 
        item.id === product.id && item.variant === variant
      );

      if (existingItem) {
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
        
        // Optimistic Update
        const updated = items.map(item =>
          item.id === product.id && item.variant === variant
            ? { ...item, quantity: newQuantity }
            : item
        );
        setItemsWithDiscounts(updated);

        // API Call
        apiService.put(apiService.ENDPOINTS.CART_ITEM(existingItem.cartId || 0), {
          quantity: newQuantity
        }).then(response => {
          if (response.error) {
            setItemsWithDiscounts(items);
            Alert.alert('Error', 'Failed to update quantity. Please try again.');
          }
        }).catch(err => {
          console.error('Error updating quantity:', err);
          setItemsWithDiscounts(items);
          Alert.alert('Error', 'Connection error. Failed to update quantity.');
        });
        return;
      }

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
      let finalDiscountedPrice = itemPrice * (1 - itemOfferPercentage / 100);
      
      const tempCartId = -Date.now();
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: itemPrice,
        category: product.category || '',
        image_url: product.image_url || '',
        stock_quantity: typeof product.stock_quantity === 'number' ? product.stock_quantity : (parseInt(String(product.stock_quantity)) || 0),
        created_at: product.created_at || new Date().toISOString(),
        offer_percentage: itemOfferPercentage,
        quantity: initialQuantity,
        variant: variant,
        cartId: tempCartId,
        usage_instructions: product.usage_instructions,
        benefits: product.benefits,
        ingredients: product.ingredients,
        shades: product.shades,
        sizes: product.sizes,
        discounted_price: finalDiscountedPrice,
        is_from_combo: false
      };

      // Optimistic Update
      const updated = [...items, newItem];
      setItemsWithDiscounts(updated);
      setSelectedItems(prev => {
        if (!prev.includes(product.id)) {
          return [...prev, product.id];
        }
        return prev;
      });

      // API Call
      apiService.post<{ id: number }>(apiService.ENDPOINTS.CART, {
        product_id: product.id,
        quantity: initialQuantity,
        variant: variant
      }).then(response => {
        if (response.error || !response.data || typeof response.data.id !== 'number') {
          throw new Error(response.error || 'Invalid response from server');
        }

        const realCartId = response.data.id;
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
        setItemsWithDiscounts(items);
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

      const cartItem = items.find(item => item.id === productId);
      if (!cartItem || !cartItem.cartId) {
        console.error('Cart item not found or missing cartId');
        return;
      }

      // Optimistic Update
      const updated = items.filter(item => item.id !== productId);
      setItemsWithDiscounts(updated);

      // API Call
      apiService.delete(apiService.ENDPOINTS.CART_ITEM(cartItem.cartId)).then(response => {
        if (response.error) {
          throw new Error(response.error);
        }
      }).catch(err => {
        console.error('Error removing item:', err);
        setItemsWithDiscounts(items);
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

      // Optimistic Update
      const updated = items.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      );
      setItemsWithDiscounts(updated);

      // API Call
      apiService.put(apiService.ENDPOINTS.CART_ITEM(cartItem.cartId), {
        quantity: newQuantity
      }).then(response => {
        if (response.error) {
          setItemsWithDiscounts(items);
          Alert.alert('Error', 'Failed to update quantity. Please try again.');
        }
      }).catch(err => {
        console.error('Error updating quantity:', err);
        setItemsWithDiscounts(items);
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