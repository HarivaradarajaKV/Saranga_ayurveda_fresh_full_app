import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAddress } from '../../AddressContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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
  address_type?: 'Home' | 'Work' | 'Other';
  country?: string;
}

export default function AddressListPage() {
  const router = useRouter();
  const { returnTo, mode } = useLocalSearchParams();
  const { addresses, setDefaultAddress, deleteAddress } = useAddress();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleAddressSelect = (address: Address) => {
    if (mode === 'select' && returnTo === 'checkout') {
      // Immediately navigate back to checkout with the selected address
      router.back();
      // Use setTimeout to ensure the navigation happens first
      setTimeout(() => {
        router.replace({
          pathname: '/checkout',
          params: { selectedAddressId: address.id.toString() }
        });
      }, 0);
    }
  };

  const renderAddressIcon = () => {
    return 'location-outline' as const;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: mode === 'select' ? 'Select Address' : 'My Addresses',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerShadowVisible: false,
        }}
      />
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0]
              })}]
            }
          ]}
        >
          <Text style={styles.headerTitle}>
            {addresses.length} {addresses.length === 1 ? 'Address' : 'Addresses'} Saved
          </Text>
          <Text style={styles.headerSubtitle}>
            Manage your delivery locations
          </Text>
        </Animated.View>

        <ScrollView 
          style={styles.addressList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {addresses.map((address, index) => (
            <Animated.View
              key={address.id}
              style={[
                styles.addressCard,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                  marginBottom: index === addresses.length - 1 ? 100 : 16
                }
              ]}
            >
              <LinearGradient
                colors={['#FFF0F5', '#fff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <TouchableOpacity
                  onPress={() => handleAddressSelect(address)}
                  activeOpacity={0.9}
                  style={styles.cardContent}
                >
                  <View style={styles.addressHeader}>
                    <View style={styles.addressType}>
                      <LinearGradient
                        colors={['#FF69B4', '#FF1493']}
                        style={styles.iconContainer}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons
                          name={renderAddressIcon()}
                          size={20}
                          color="#fff"
                        />
                      </LinearGradient>
                      <View style={styles.typeContainer}>
                        <Text style={styles.addressTypeText}>Delivery Address</Text>
                        {address.is_default && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultText}>Default</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {mode !== 'select' && (
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.editButton]}
                          onPress={() => router.push({
                            pathname: '/profile/addresses/edit',
                            params: { id: address.id }
                          })}
                        >
                          <Ionicons name="pencil" size={18} color="#FF69B4" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.deleteButton]}
                          onPress={() => deleteAddress(address.id)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#ff4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <View style={styles.addressDetails}>
                    <Text style={styles.name}>{address.full_name}</Text>
                    <Text style={styles.addressText}>
                      {address.address_line1}
                      {address.address_line2 ? `, ${address.address_line2}` : ''}
                    </Text>
                    <Text style={styles.addressText}>
                      {address.city}, {address.state} - {address.postal_code}
                    </Text>
                    <Text style={styles.phone}>
                      <Ionicons name="call-outline" size={14} color="#666" /> {address.phone_number}
                    </Text>
                  </View>

                  {!address.is_default && mode !== 'select' && (
                    <TouchableOpacity
                      style={styles.setDefaultButton}
                      onPress={() => setDefaultAddress(address.id)}
                    >
                      <LinearGradient
                        colors={['#FF69B4', '#FF1493']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.defaultGradient}
                      >
                        <Ionicons name="star" size={16} color="#fff" style={styles.defaultIcon} />
                        <Text style={styles.setDefaultText}>Set as Default</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          ))}

          {addresses.length === 0 && (
            <Animated.View 
              style={[
                styles.emptyState,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              <LinearGradient
                colors={['#FFF0F5', '#FFE4E1']}
                style={styles.emptyStateGradient}
              >
                <Ionicons name="location-outline" size={64} color="#FF69B4" />
                <Text style={styles.emptyStateText}>No addresses saved yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Add your delivery addresses to make checkout faster
                </Text>
              </LinearGradient>
            </Animated.View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/profile/addresses/new')}
        >
          <LinearGradient
            colors={['#FF69B4', '#FF1493']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addButtonGradient}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add New Address</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E1',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  addressList: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  addressCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardGradient: {
    borderRadius: 16,
  },
  cardContent: {
    padding: 16,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  addressType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  iconContainer: {
    padding: 10,
    borderRadius: 12,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addressTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF69B4',
  },
  defaultBadge: {
    backgroundColor: '#FFF0F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  defaultText: {
    color: '#FF69B4',
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: '#FFF0F5',
  },
  deleteButton: {
    backgroundColor: '#FFE4E4',
  },
  addressDetails: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  phone: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  setDefaultButton: {
    overflow: 'hidden',
    borderRadius: 8,
  },
  defaultGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  defaultIcon: {
    marginRight: 6,
  },
  setDefaultText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyStateGradient: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    width: width - 48,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 