import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';

interface ProductReview {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  user_id: number;
  user_name: string;
  product_id: number;
  product_name: string;
}

interface AppReview {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  user_id: number;
  user_name: string;
  avatar_url?: string;
}

export default function AdminReviews() {
  const [tab, setTab] = useState<'product' | 'app'>('product');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [productReviews, setProductReviews] = useState<ProductReview[]>([]);
  const [appReviews, setAppReviews] = useState<AppReview[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, appRes] = await Promise.all([
        apiService.get(apiService.ENDPOINTS.ADMIN_REVIEWS),
        apiService.get(apiService.ENDPOINTS.BRAND_REVIEWS)
      ]);
      setProductReviews(Array.isArray(prodRes.data) ? prodRes.data : []);
      const appPayload = appRes.data;
      setAppReviews(Array.isArray(appPayload?.reviews) ? appPayload.reviews : Array.isArray(appPayload) ? appPayload : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const deleteProductReview = async (id: number) => {
    try {
      const res = await apiService.delete(apiService.ENDPOINTS.ADMIN_REVIEW(id));
      if (!res.error) {
        setProductReviews(prev => prev.filter(r => r.id !== id));
      }
    } catch {}
  };

  const Badge = ({ rating }: { rating: number }) => (
    <View style={styles.badge}><Text style={styles.badgeText}>{rating.toFixed(1)} ★</Text></View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <Stack.Screen options={{ title: 'Reviews' }} />
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setTab('product')} style={[styles.tab, tab==='product' && styles.tabActive]}>
          <Text style={[styles.tabText, tab==='product' && styles.tabTextActive]}>Product Reviews</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('app')} style={[styles.tab, tab==='app' && styles.tabActive]}>
          <Text style={[styles.tabText, tab==='app' && styles.tabTextActive]}>Application Reviews</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#694d21" /></View>
      ) : (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {tab === 'product' ? (
            productReviews.length === 0 ? (
              <Text style={styles.empty}>No product reviews</Text>
            ) : (
              productReviews.map((r) => (
                <View key={r.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.title}>{r.product_name}</Text>
                    <Badge rating={Number(r.rating || 0)} />
                  </View>
                  <Text style={styles.comment}>{r.comment || '—'}</Text>
                  <View style={styles.rowBetween}>
                    <Text style={styles.meta}>by {r.user_name}</Text>
                    <Text style={styles.meta}>{new Date(r.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</Text>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => deleteProductReview(r.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash" size={16} color="#fff" />
                      <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          ) : (
            appReviews.length === 0 ? (
              <Text style={styles.empty}>No application reviews</Text>
            ) : (
              appReviews.map((r) => (
                <View key={r.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.title}>{r.user_name}</Text>
                    <Badge rating={Number(r.rating || 0)} />
                  </View>
                  <Text style={styles.comment}>{r.comment || '—'}</Text>
                  <Text style={styles.meta}>{new Date(r.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</Text>
                </View>
              ))
            )
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: '#fff', margin: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#f3efe9' },
  tabText: { color: '#666', fontWeight: '600' },
  tabTextActive: { color: '#694d21' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', marginTop: 24, color: '#666' },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 8, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: '#222' },
  comment: { color: '#333', marginTop: 6, marginBottom: 8 },
  meta: { color: '#777', fontSize: 12 },
  actions: { marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#d9534f', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  deleteText: { color: '#fff', fontWeight: '600' },
  badge: { backgroundColor: '#f1f5ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#1f6feb', fontWeight: '700' },
});


