import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { apiService } from '../services/api';

interface Coupon {
  id: number;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount: number | null;
  start_date: string;
  end_date: string;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  product_ids?: number[];
  product_names?: string[];
}

interface CouponFormData {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount: number | null;
  start_date: Date;
  end_date: Date;
  usage_limit: number | null;
  product_ids: number[];
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [formData, setFormData] = useState<CouponFormData>({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_purchase_amount: 0,
    max_discount_amount: null,
    start_date: new Date(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    usage_limit: null,
    product_ids: [],
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCoupons();
      if (response.error) {
        throw new Error(response.error);
      }
      setCoupons(response.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoupon = async () => {
    try {
      if (!validateForm()) return;

      const response = await apiService.createCoupon({
        ...formData,
        start_date: formData.start_date.toISOString(),
        end_date: formData.end_date.toISOString(),
      });

      if (response.error) {
        throw new Error(response.error);
      }

      Alert.alert('Success', 'Coupon created successfully');
      setShowAddModal(false);
      resetForm();
      fetchCoupons();
    } catch (error) {
      Alert.alert('Error', 'Failed to create coupon');
    }
  };

  const handleDeleteCoupon = async (id: number) => {
    try {
      const response = await apiService.deleteCoupon(id);
      if (response.error) {
        throw new Error(response.error);
      }
      Alert.alert('Success', 'Coupon deleted successfully');
      fetchCoupons();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete coupon');
    }
  };

  const validateForm = () => {
    if (!formData.code) {
      Alert.alert('Error', 'Please enter a coupon code');
      return false;
    }
    if (formData.discount_value <= 0) {
      Alert.alert('Error', 'Discount value must be greater than 0');
      return false;
    }
    if (formData.end_date <= formData.start_date) {
      Alert.alert('Error', 'End date must be after start date');
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_purchase_amount: 0,
      max_discount_amount: null,
      start_date: new Date(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usage_limit: null,
      product_ids: [],
    });
  };

  const renderCouponCard = (coupon: Coupon) => (
    <View key={coupon.id} style={styles.couponCard}>
      <View style={styles.couponHeader}>
        <Text style={styles.couponCode}>{coupon.code}</Text>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Delete Coupon',
              'Are you sure you want to delete this coupon?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', onPress: () => handleDeleteCoupon(coupon.id), style: 'destructive' },
              ]
            );
          }}
        >
          <Ionicons name="trash-outline" size={24} color="#ff4444" />
        </TouchableOpacity>
      </View>
      <Text style={styles.couponDescription}>{coupon.description}</Text>
      <View style={styles.couponDetails}>
        <Text style={styles.detailText}>
          Discount: {coupon.discount_value}
          {coupon.discount_type === 'percentage' ? '%' : ' ₹'}
        </Text>
        <Text style={styles.detailText}>
          Min Purchase: ₹{coupon.min_purchase_amount}
        </Text>
        {coupon.max_discount_amount && (
          <Text style={styles.detailText}>
            Max Discount: ₹{coupon.max_discount_amount}
          </Text>
        )}
      </View>
      <View style={styles.couponFooter}>
        <Text style={styles.validityText}>
          Valid till: {new Date(coupon.end_date).toLocaleDateString()}
        </Text>
        <Text style={[
          styles.statusText,
          { color: coupon.is_active ? '#28a745' : '#dc3545' }
        ]}>
          {coupon.is_active ? 'Active' : 'Inactive'}
        </Text>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Manage Coupons',
          headerShown: true,
        }}
      />
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add New Coupon</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#0066CC" />
        ) : (
          <ScrollView style={styles.couponList}>
            {coupons.map(renderCouponCard)}
          </ScrollView>
        )}

        <Modal
          visible={showAddModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalContainer}>
            <ScrollView style={styles.modalScrollView}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add New Coupon</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
              
                <TextInput
                  style={styles.input}
                  placeholder="Coupon Code"
                  value={formData.code}
                  onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
                  placeholderTextColor="#999"
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#999"
                />

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Discount Type</Text>
                  <View style={styles.row}>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        formData.discount_type === 'percentage' && styles.selectedType
                      ]}
                      onPress={() => setFormData({ ...formData, discount_type: 'percentage' })}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        formData.discount_type === 'percentage' && styles.selectedTypeText
                      ]}>
                        Percentage
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        formData.discount_type === 'fixed' && styles.selectedType
                      ]}
                      onPress={() => setFormData({ ...formData, discount_type: 'fixed' })}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        formData.discount_type === 'fixed' && styles.selectedTypeText
                      ]}>
                        Fixed Amount
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Discount Value</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={`Enter ${formData.discount_type === 'percentage' ? 'percentage' : 'amount'}`}
                    value={formData.discount_value.toString()}
                    onChangeText={(text) => setFormData({ ...formData, discount_value: parseFloat(text) || 0 })}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Minimum Purchase Amount</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter minimum amount"
                    value={formData.min_purchase_amount.toString()}
                    onChangeText={(text) => setFormData({ ...formData, min_purchase_amount: parseFloat(text) || 0 })}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Maximum Discount Amount (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter maximum discount"
                    value={formData.max_discount_amount?.toString() || ''}
                    onChangeText={(text) => setFormData({ ...formData, max_discount_amount: parseFloat(text) || null })}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Validity Period</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      setDatePickerMode('start');
                      setShowDatePicker(true);
                    }}
                  >
                    <Text style={styles.dateButtonText}>Start Date: {formData.start_date.toLocaleDateString()}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      setDatePickerMode('end');
                      setShowDatePicker(true);
                    }}
                  >
                    <Text style={styles.dateButtonText}>End Date: {formData.end_date.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={datePickerMode === 'start' ? formData.start_date : formData.end_date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (selectedDate) {
                        setFormData({
                          ...formData,
                          [datePickerMode === 'start' ? 'start_date' : 'end_date']: selectedDate,
                        });
                      }
                    }}
                  />
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Usage Limit (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter maximum number of uses"
                    value={formData.usage_limit?.toString() || ''}
                    onChangeText={(text) => setFormData({ ...formData, usage_limit: parseInt(text) || null })}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleAddCoupon}
                  >
                    <Text style={styles.buttonText}>Create Coupon</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  couponList: {
    flex: 1,
  },
  couponCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  couponCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  couponDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  couponDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  couponFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  validityText: {
    fontSize: 12,
    color: '#666',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  modalScrollView: {
    maxHeight: '90%',
    marginHorizontal: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  selectedType: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  selectedTypeText: {
    color: '#fff',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ff4444',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 