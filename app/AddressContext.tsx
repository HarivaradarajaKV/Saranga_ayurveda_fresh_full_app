import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { apiService } from './services/api';

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
}

interface AddressContextType {
  addresses: Address[];
  loading: boolean;
  fetchAddresses: () => Promise<void>;
  addAddress: (address: Omit<Address, 'id'>) => Promise<void>;
  updateAddress: (id: number, address: Partial<Address>) => Promise<void>;
  deleteAddress: (id: number) => Promise<void>;
  setDefaultAddress: (id: number) => Promise<void>;
  getDefaultAddress: () => Address | undefined;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

const ADDRESSES_CACHE_KEY = 'addresses_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export const AddressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const hasInitializedRef = useRef(false);
  const fetchInProgressRef = useRef(false);

  // Load cached addresses and check auth status on mount - ONLY ONCE
  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitializedRef.current) {
      return;
    }

    const initAddresses = async () => {
      hasInitializedRef.current = true;
      const cached = await loadCachedAddresses();
      if (!cached) {
        await checkAuthAndFetchAddresses();
      }
    };
    
    initAddresses();
    
    // NO setInterval - we only fetch once on mount
    // If addresses need to be refreshed, components should call fetchAddresses() explicitly
  }, []);

  const loadCachedAddresses = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(ADDRESSES_CACHE_KEY);
      if (cachedData) {
        const { addresses: cachedAddresses, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          console.log('[AddressContext] Using cached addresses');
          setAddresses(cachedAddresses);
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
        setAddresses(addressesData);
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

  const addAddress = async (address: Omit<Address, 'id'>) => {
    try {
      setLoading(true);
      const response = await apiService.post('/addresses', address);
      if (response.data) {
        const newAddresses = [...addresses, response.data];
        setAddresses(newAddresses);
        await saveAddressesToCache(newAddresses);
        Alert.alert('Success', 'Address added successfully');
      }
    } catch (error) {
      console.error('[AddressContext] Error adding address:', error);
      Alert.alert('Error', 'Failed to add address');
    } finally {
      setLoading(false);
    }
  };

  const updateAddress = async (id: number, address: Partial<Address>) => {
    try {
      setLoading(true);
      console.log('[AddressContext] Updating address:', { id, address });
      
      // If setting as default, update all other addresses first
      if (address.is_default) {
        const updatedAddresses = addresses.map(addr => ({
          ...addr,
          is_default: false
        }));
        setAddresses(updatedAddresses);
      }
      
      const response = await apiService.put(`/addresses/${id}`, address);
      if (response.data) {
        const updatedAddresses = addresses.map(addr =>
          addr.id === id ? { ...addr, ...response.data } : addr
        );
        console.log('[AddressContext] Updated addresses:', updatedAddresses);
        setAddresses(updatedAddresses);
        await saveAddressesToCache(updatedAddresses);
        Alert.alert('Success', 'Address updated successfully');
      }
    } catch (error) {
      console.error('[AddressContext] Error updating address:', error);
      Alert.alert('Error', 'Failed to update address');
    } finally {
      setLoading(false);
    }
  };

  const deleteAddress = async (id: number) => {
    try {
      setLoading(true);
      const response = await apiService.delete(`/addresses/${id}`);
      if (response.data?.success) {
        const updatedAddresses = addresses.filter(addr => addr.id !== id);
        setAddresses(updatedAddresses);
        await saveAddressesToCache(updatedAddresses);
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
      await updateAddress(id, { is_default: true });
    } catch (error) {
      console.error('[AddressContext] Error setting default address:', error);
      Alert.alert('Error', 'Failed to set default address');
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
    throw new Error('useAddress must be used within an AddressProvider');
  }
  return context;
};

export default AddressProvider; 