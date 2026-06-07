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
import { BlurView } from 'expo-blur';

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
  address_type?: string;
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

  const handleAddressSelect = async (address: Address) => {
    await setDefaultAddress(address.id);
    router.back();
    setTimeout(() => {
      router.replace('/(tabs)/cart');
    }, 0);
  };

  const renderAddressIcon = () => {
    return 'location-outline' as const;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <LinearGradient
        colors={['#f8f6f0', '#faf8f3', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ width: '100%', maxWidth: 650, alignSelf: 'center', flex: 1 }}>
        <View style={styles.headerSection}>
          <Text style={styles.brandTitle}>Address</Text>
        </View>
        <View style={styles.container}>

        <ScrollView
          style={styles.addressList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {addresses.length > 0 ? (
            <Animated.View
              style={[
                styles.addressCard,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                  marginBottom: 100
                }
              ]}
            >
              <BlurView intensity={20} style={styles.cardGradient} tint="light">
                <LinearGradient
                  colors={['#f8f6f0', '#fff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.cardContent}>
                  {/* Unified Delivery Address Header */}
                  <View style={[styles.addressHeader, { marginBottom: 16 }]}>
                    <View style={styles.addressType}>
                      <View
                        style={[
                          styles.iconContainer,
                          {
                            backgroundColor: '#f2f4f0',
                            borderWidth: 1,
                            borderColor: 'rgba(43, 58, 26, 0.1)',
                            shadowColor: 'transparent',
                            elevation: 0,
                            padding: 8,
                            borderRadius: 10,
                          }
                        ]}
                      >
                        <Ionicons
                          name={renderAddressIcon()}
                          size={16}
                          color="#2b3a1a"
                        />
                      </View>
                      <View style={styles.typeContainer}>
                        <Text style={styles.addressTypeText}>Delivery To</Text>
                      </View>
                    </View>
                  </View>

                  {/* List of addresses inside this single section */}
                  {addresses.map((address, index) => (
                    <TouchableOpacity
                      key={address.id}
                      onPress={() => handleAddressSelect(address)}
                      activeOpacity={0.9}
                      style={[
                        {
                          marginTop: index > 0 ? 12 : 0,
                          borderTopWidth: index > 0 ? 1 : 0,
                          borderColor: 'rgba(43, 58, 26, 0.08)',
                          paddingTop: index > 0 ? 16 : 0,
                        }
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                          <Text style={[styles.name, { marginBottom: 0 }]}>{address.full_name}</Text>
                          {address.is_default && (
                            <View style={styles.defaultBadge}>
                              <Text style={styles.defaultText}>Default</Text>
                            </View>
                          )}
                        </View>
                        {mode !== 'select' && (
                          <View style={styles.actionButtons}>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.editButton, { borderColor: '#2b3a1a', backgroundColor: '#f2f4f0' }]}
                              onPress={() => router.push({
                                pathname: '/profile/addresses/edit',
                                params: { id: address.id }
                              })}
                            >
                              <Ionicons name="pencil" size={16} color="#2b3a1a" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.deleteButton]}
                              onPress={() => deleteAddress(address.id)}
                            >
                              <Ionicons name="trash-outline" size={16} color="#ff4444" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                      <Text style={styles.addressText}>
                        {address.address_line1}
                        {address.address_line2 ? `, ${address.address_line2}` : ''}
                      </Text>
                      <Text style={styles.addressText}>
                        {address.city}, {address.state} - {address.postal_code}
                      </Text>
                      <Text style={styles.phone}>
                        <Ionicons name="call-outline" size={14} color="#2b3a1a" /> {address.phone_number}
                      </Text>

                      {!address.is_default && mode !== 'select' && (
                        <TouchableOpacity
                          style={styles.setDefaultButton}
                          onPress={() => handleAddressSelect(address)}
                        >
                          <LinearGradient
                            colors={['#2b3a1a', '#1e2912']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.defaultGradient}
                          >
                            <Text style={styles.setDefaultText}>Set as Default</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </BlurView>
            </Animated.View>
          ) : (
            null
          )}

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
                colors={['#f8f6f0', '#f5f2eb']}
                style={[styles.emptyStateGradient, { width: '100%' }]}
              >
                <Ionicons name="location-outline" size={64} color="#2b3a1a" />
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
            colors={['#2b3a1a', '#1e2912']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addButtonGradient}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add New Address</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
  headerSection: {
    paddingTop: Platform.OS === 'ios' ? 20 : (StatusBar.currentHeight ?? 0) + 20,
    paddingBottom: 6,
    zIndex: 10,
  },
  brandTitle: {
    fontSize: 42,
    color: '#2b3a1a',
    textAlign: 'center',
    fontFamily: 'CormorantGaramond-Bold',
    letterSpacing: 1,
    marginBottom: 16,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerGradient: {
    padding: 20,
    alignItems: 'center',
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f2eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(105, 77, 33, 0.1)',
  },
  headerTitle: {
    fontFamily: 'CormorantGaramond-Bold',
    fontSize: 26,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontFamily: 'CormorantGaramond-Medium',
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  addressList: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  addressCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  cardGradient: {
    borderRadius: 20,
    overflow: 'hidden',
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
    padding: 12,
    borderRadius: 14,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  addressTypeText: {
    fontFamily: 'CormorantGaramond-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: '#2c3e50',
    letterSpacing: 0.3,
  },
  defaultBadge: {
    backgroundColor: '#f5f2eb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(105, 77, 33, 0.2)',
  },
  defaultText: {
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
    fontSize: 12,
    fontWeight: '600',
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
    backgroundColor: '#f5f2eb',
    borderWidth: 1,
    borderColor: 'rgba(105, 77, 33, 0.2)',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  addressDetails: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 22,
    fontWeight: '500',
  },
  phone: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    fontWeight: '500',
  },
  setDefaultButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  defaultGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  defaultIcon: {
    marginRight: 6,
  },
  setDefaultText: {
    fontFamily: 'CormorantGaramond-Bold',
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  addButtonText: {
    fontFamily: 'CormorantGaramond-Bold',
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.5,
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
    fontFamily: 'CormorantGaramond-Bold',
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontFamily: 'CormorantGaramond-Medium',
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 