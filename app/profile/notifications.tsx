import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { apiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'order' | 'promotion' | 'system';
  read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchNotifications();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // For now, using mock data until backend endpoint is ready
      const mockNotifications: Notification[] = [
        {
          id: 1,
          title: 'Order Confirmed',
          message: 'Your order #12345 has been confirmed and is being processed.',
          type: 'order',
          read: false,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          title: 'Special Offer',
          message: 'Get 20% off on all skincare products this weekend!',
          type: 'promotion',
          read: true,
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 3,
          title: 'Welcome!',
          message: 'Welcome to our cosmetics app. Start exploring our products!',
          type: 'system',
          read: true,
          created_at: new Date(Date.now() - 172800000).toISOString()
        }
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      // Update local state for immediate feedback
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );

      // TODO: Implement API call to mark notification as read
      // await apiService.put(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return 'cart';
      case 'promotion':
        return 'pricetag';
      case 'system':
        return 'information-circle';
      default:
        return 'notifications';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unreadNotification]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={[styles.iconContainer, { backgroundColor: getIconBackground(item.type) }]}>
        <Ionicons name={getNotificationIcon(item.type)} size={24} color="#fff" />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>{formatDate(item.created_at)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const getIconBackground = (type: string) => {
    switch (type) {
      case 'order':
        return '#4CAF50';
      case 'promotion':
        return '#FF69B4';
      case 'system':
        return '#2196F3';
      default:
        return '#757575';
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.message}>Please log in to view notifications</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/settings')} style={{ paddingHorizontal: 8 }}>
              <Ionicons name="settings-outline" size={22} color="#694d21" />
            </TouchableOpacity>
          )
        }}
      />
      <View style={styles.container}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FF69B4" />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="notifications-off" size={48} color="#ccc" />
            <Text style={styles.message}>No notifications yet</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            ListHeaderComponent={() => (
              <TouchableOpacity
                onPress={() => router.push('/settings')}
                activeOpacity={0.8}
                style={styles.settingsCard}
              >
                <View style={styles.settingsIconWrap}>
                  <Ionicons name="color-palette-outline" size={20} color="#694d21" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingsTitle}>Theme & Appearance</Text>
                  <Text style={styles.settingsSubtitle}>Switch between light and dark mode</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#694d21" />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#efd8bb',
    marginBottom: 12,
  },
  settingsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fffbe9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#efd8bb',
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  settingsSubtitle: {
    fontSize: 12,
    color: '#694d21',
    marginTop: 2,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadNotification: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderLeftColor: '#FF69B4',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF69B4',
    marginLeft: 8,
  },
}); 