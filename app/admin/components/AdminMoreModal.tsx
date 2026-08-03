import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from '../../services/authEvents';

interface AdminMoreModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AdminMoreModal: React.FC<AdminMoreModalProps> = ({ visible, onClose }) => {
  const router = useRouter();

  const navigateTo = (route: string) => {
    onClose();
    try {
      router.replace(route as any);
    } catch (e) {
      console.error('Navigation error:', e);
    }
  };

  const handleLogout = () => {
    onClose();
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of the Admin panel?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('auth_token');
              await AsyncStorage.removeItem('user_role');
              await AsyncStorage.removeItem('name');
              await AsyncStorage.removeItem('user_name');
              authEvents.notify();
              router.replace('/(tabs)');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Admin Navigation & Options</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalMenuGrid}>
            <TouchableOpacity style={styles.modalMenuItem} onPress={() => navigateTo('/admin/dashboard')}>
              <View style={styles.menuIconBg}>
                <Ionicons name="grid-outline" size={22} color="#2D4B34" />
              </View>
              <Text style={styles.modalMenuText}>Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalMenuItem} onPress={() => navigateTo('/admin/products')}>
              <View style={styles.menuIconBg}>
                <Ionicons name="cube-outline" size={22} color="#2D4B34" />
              </View>
              <Text style={styles.modalMenuText}>Products</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalMenuItem} onPress={() => navigateTo('/admin/categories')}>
              <View style={styles.menuIconBg}>
                <Ionicons name="list-outline" size={22} color="#2D4B34" />
              </View>
              <Text style={styles.modalMenuText}>Categories</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalMenuItem} onPress={() => navigateTo('/admin/orders')}>
              <View style={styles.menuIconBg}>
                <Ionicons name="bag-handle-outline" size={22} color="#2D4B34" />
              </View>
              <Text style={styles.modalMenuText}>Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalMenuItem} onPress={() => navigateTo('/admin/users')}>
              <View style={styles.menuIconBg}>
                <Ionicons name="people-outline" size={22} color="#2D4B34" />
              </View>
              <Text style={styles.modalMenuText}>Customers</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalMenuItem} onPress={() => navigateTo('/admin/coupons')}>
              <View style={styles.menuIconBg}>
                <Ionicons name="ticket-outline" size={22} color="#2D4B34" />
              </View>
              <Text style={styles.modalMenuText}>Coupons</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalMenuItem} onPress={() => navigateTo('/admin/banners')}>
              <View style={styles.menuIconBg}>
                <Ionicons name="images-outline" size={22} color="#2D4B34" />
              </View>
              <Text style={styles.modalMenuText}>Banners</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalMenuItem} onPress={() => navigateTo('/admin/combos')}>
              <View style={styles.menuIconBg}>
                <Ionicons name="layers-outline" size={22} color="#2D4B34" />
              </View>
              <Text style={styles.modalMenuText}>Combos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalMenuItem} onPress={() => navigateTo('/admin/gst')}>
              <View style={styles.menuIconBg}>
                <Ionicons name="receipt-outline" size={22} color="#2D4B34" />
              </View>
              <Text style={styles.modalMenuText}>GST</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalMenuItem} onPress={() => navigateTo('/admin/best-sellers')}>
              <View style={styles.menuIconBg}>
                <Ionicons name="star-outline" size={22} color="#2D4B34" />
              </View>
              <Text style={styles.modalMenuText}>Best Sellers</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalMenuItem} onPress={() => navigateTo('/admin/invoices')}>
              <View style={styles.menuIconBg}>
                <Ionicons name="document-text-outline" size={22} color="#2D4B34" />
              </View>
              <Text style={styles.modalMenuText}>Invoices</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.modalLogoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={styles.modalLogoutText}>Sign Out from Admin</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  modalMenuItem: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  menuIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF6ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  modalMenuText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  modalLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  modalLogoutText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
});
