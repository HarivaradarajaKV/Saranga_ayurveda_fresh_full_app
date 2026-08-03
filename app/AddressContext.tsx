import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { apiService } from './services/api';
import { authEvents } from './services/authEvents';

interface Address {
  id: number;
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  phone_number: string;
  is_default: boolean;
  address_type?: string;
  country?: string;
}

interface AddressContextType {
  addresses: Address[];
  loading: boolean;
  fetchAddresses: () => Promise<void>;
  addAddress: (address: Omit<Address, 'id'>, showAlert?: boolean) => Promise<void>;
  updateAddress: (id: number, address: Partial<Address>, showAlert?: boolean) => Promise<void>;
  deleteAddress: (id: number) => Promise<void>;
  setDefaultAddress: (id: number) => Promise<void>;
  getDefaultAddress: () => Address | undefined;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

const ADDRESSES_CACHE_KEY = 'addresses_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const sortAddresses = (list: Address[]) => {
  return [...list].sort((a, b) => {
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    return 0;
  });
};

export const AddressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const hasInitializedRef = useRef(false);
  const fetchInProgressRef = useRef(false);

  // Sync addresses on mount and whenever user logs in / auth state changes
  useEffect(() => {
    const syncAddressAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          fetchInProgressRef.current = false;
          const cached = await loadCachedAddresses();
          if (!cached) {
            await fetchAddresses();
          }
        } else {
          setAddresses([]);
          await AsyncStorage.removeItem(ADDRESSES_CACHE_KEY);
        }
      } catch (e) {
        console.error('[AddressContext] Sync auth error:', e);
      }
    };

    syncAddressAuth();

    const unsubscribe = authEvents.subscribe(() => {
      fetchInProgressRef.current = false;
      syncAddressAuth();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadCachedAddresses = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(ADDRESSES_CACHE_KEY);
      if (cachedData) {
        const { addresses: cachedAddresses, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          console.log('[AddressContext] Using cached addresses');
          setAddresses(sortAddresses(cachedAddresses));
          setLastFetch(timestamp);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('[AddressContext] Error loading cached addresses:', error);
      return false;
    }
  };

  const saveAddressesToCache = async (addressesData: Address[]) => {
    try {
      const cacheData = {
        addresses: addressesData,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(ADDRESSES_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('[AddressContext] Error saving addresses to cache:', error);
    }
  };

  const checkAuthAndFetchAddresses = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        await fetchAddresses();
      } else {
        setAddresses([]);
        await AsyncStorage.removeItem(ADDRESSES_CACHE_KEY);
      }
    } catch (error) {
      console.error('[AddressContext] Error checking auth:', error);
    }
  };

  const fetchAddresses = async () => {
    // Prevent multiple simultaneous fetches
    if (fetchInProgressRef.current) {
      console.log('[AddressContext] Fetch already in progress, skipping...');
      return;
    }

    // Return cached addresses if they're still valid
    if (Date.now() - lastFetch < CACHE_EXPIRY && addresses.length > 0) {
      console.log('[AddressContext] Using cached addresses');
      return;
    }

    fetchInProgressRef.current = true;

    try {
      setLoading(true);
      console.log('[AddressContext] Fetching addresses...');
      const response = await apiService.get('/addresses');
      
      if (response?.data) {
        const addressesData = Array.isArray(response.data) ? response.data : [response.data];
        console.log('[AddressContext] Addresses fetched:', addressesData);
        setAddresses(sortAddresses(addressesData));
        setLastFetch(Date.now());
        await saveAddressesToCache(addressesData);
      } else {
        console.log('[AddressContext] No addresses found');
        setAddresses([]);
        setLastFetch(Date.now()); // Update lastFetch even for empty results to prevent repeated calls
      }
    } catch (error) {
      console.error('[AddressContext] Error fetching addresses:', error);
      setAddresses([]);
      setLastFetch(Date.now()); // Update lastFetch on error to prevent repeated calls
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  };

  const addAddress = async (address: Omit<Address, 'id'>, showAlert = true) => {
    try {
      setLoading(true);
      const response = await apiService.post('/addresses', address);
      if (response.data) {
        const newAddresses = [...addresses, response.data];
        setAddresses(sortAddresses(newAddresses));
        await saveAddressesToCache(newAddresses);
        if (showAlert) {
          Alert.alert('Success', 'Address added successfully');
        }
      }
    } catch (error) {
      console.error('[AddressContext] Error adding address:', error);
      if (showAlert) {
        Alert.alert('Error', 'Failed to add address');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateAddress = async (id: number, address: Partial<Address>, showAlert = true) => {
    try {
      setLoading(true);
      console.log('[AddressContext] Updating address:', { id, address });
      
      // If setting as default, update all other addresses first
      if (address.is_default) {
        const updatedAddresses = addresses.map(addr => ({
          ...addr,
          is_default: addr.id === id
        }));
        setAddresses(sortAddresses(updatedAddresses));
      }
      
      const response = await apiService.put(`/addresses/${id}`, address);
      if (response.data) {
        const updatedAddresses = addresses.map(addr => {
          if (addr.id === id) {
            return { ...addr, ...response.data };
          }
          return {
            ...addr,
            is_default: response.data.is_default ? false : addr.is_default
          };
        });
        console.log('[AddressContext] Updated addresses:', updatedAddresses);
        const finalAddresses = sortAddresses(updatedAddresses);
        setAddresses(finalAddresses);
        await saveAddressesToCache(finalAddresses);
        if (showAlert) {
          Alert.alert('Success', 'Address updated successfully');
        }
      }
    } catch (error) {
      console.error('[AddressContext] Error updating address:', error);
      if (showAlert) {
        Alert.alert('Error', 'Failed to update address');
      }
    } finally {
      setLoading(false);
    }
  };
 
  const deleteAddress = async (id: number) => {
    try {
      setLoading(true);
      const response = await apiService.delete(`/addresses/${id}`);
      if (response.data?.success || response.data?.msg) {
        const updatedAddresses = addresses.filter(addr => addr.id !== id);
        const finalAddresses = sortAddresses(updatedAddresses);
        setAddresses(finalAddresses);
        await saveAddressesToCache(finalAddresses);
        Alert.alert('Success', 'Address deleted successfully');
      }
    } catch (error) {
      console.error('[AddressContext] Error deleting address:', error);
      Alert.alert('Error', 'Failed to delete address');
    } finally {
      setLoading(false);
    }
  };
 
  const setDefaultAddress = async (id: number) => {
    try {
      setLoading(true);
      const response = await apiService.put(`/addresses/${id}/default`, {});
      if (response.data?.success) {
        const updatedAddresses = addresses.map(addr => ({
          ...addr,
          is_default: addr.id === id
        }));
        const finalAddresses = sortAddresses(updatedAddresses);
        setAddresses(finalAddresses);
        await saveAddressesToCache(finalAddresses);
      }
    } catch (error) {
      console.error('[AddressContext] Error setting default address:', error);
      Alert.alert('Error', 'Failed to set default address');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultAddress = () => {
    return addresses.find(addr => addr.is_default);
  };

  const value = {
    addresses,
    loading,
    fetchAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    getDefaultAddress,
  };

  return (
    <AddressContext.Provider value={value}>
      {children}
    </AddressContext.Provider>
  );
};

export const useAddress = () => {
  const context = useContext(AddressContext);
  if (!context) {
    // Return default values instead of throwing to prevent crashes
    console.warn('useAddress must be used within an AddressProvider, using defaults');
    return {
      addresses: [],
      loading: false,
      fetchAddresses: async () => {},
      addAddress: async (address: Omit<Address, 'id'>, showAlert?: boolean) => {},
      updateAddress: async (id: number, address: Partial<Address>, showAlert?: boolean) => {},
      deleteAddress: async () => {},
      setDefaultAddress: async () => {},
      getDefaultAddress: () => undefined,
    };
  }
  return context;
};

export default AddressProvider; 