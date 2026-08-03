import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
  Dimensions,
  Platform,
  StatusBar,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from '../services/authEvents';
import { apiService } from '../services/api';
import { API_BASE_URL } from '../config/api';
import { Ionicons } from '@expo/vector-icons';
import { Buffer } from 'buffer';
import { AdminMoreModal } from './components/AdminMoreModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 160;
const CHART_INNER_W = SCREEN_WIDTH - 80; // usable chart width minus y-axis area

// Helper to format currency in INR (₹)
const formatCurrency = (val: number | string | null | undefined) => {
  const num = parseFloat(String(val || 0));
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper to format image URLs from API
const resolveImageUrl = (path: string | undefined | null) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return { uri: path };
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = API_BASE_URL || 'http://10.0.2.2:5000';
  return { uri: `${base}${cleanPath}` };
};

/** Helper: compute segment connector between two chart points, centered at midpoint for correct RN rotation */
function lineSegment(
  ax: number, ay: number,
  bx: number, by: number,
  color: string,
  key: string | number
) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const midX = (ax + bx) / 2;
  const midY = (ay + by) / 2;
  return (
    <View
      key={key}
      style={{
        position: 'absolute',
        left: midX - len / 2,
        top: midY - 1,
        width: len,
        height: 2.5,
        backgroundColor: color,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

/** Renders a dual line chart — Revenue (green) and Orders (gold) as connected line graphs */
const DualLineChart = React.memo(({ data, maxRevenue, maxOrders }: {
  data: ChartPoint[];
  maxRevenue: number;
  maxOrders: number;
}) => {
  if (data.length === 0) {
    return (
      <View style={{ height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#9CA3AF', fontSize: 13 }}>No chart data for this period</Text>
      </View>
    );
  }

  const n = data.length;
  // Evenly space X positions across full chart width
  const xStep = n > 1 ? CHART_INNER_W / (n - 1) : CHART_INNER_W / 2;
  const xOf = (i: number) => (n === 1 ? CHART_INNER_W / 2 : i * xStep);

  // Y coordinate: inverted (0 = top), clamped to 88% of height so dots stay within bounds
  const revY = (v: number) => CHART_HEIGHT - Math.round((v / maxRevenue) * CHART_HEIGHT * 0.85) - 4;
  const ordY = (v: number) => CHART_HEIGHT - Math.round((v / maxOrders) * CHART_HEIGHT * 0.72) - 4;

  const revPoints = data.map((pt, i) => ({ x: xOf(i), y: revY(pt.revenue) }));
  const ordPoints = data.map((pt, i) => ({ x: xOf(i), y: ordY(pt.orders) }));

  return (
    <View style={{ height: CHART_HEIGHT, width: CHART_INNER_W, position: 'relative' }}>
      {/* Horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
        <View
          key={`grid-${i}`}
          style={{
            position: 'absolute',
            left: 0, right: 0,
            top: Math.round(ratio * CHART_HEIGHT),
            height: 1,
            backgroundColor: '#F3F4F6',
          }}
        />
      ))}

      {/* Revenue line segments (green) */}
      {revPoints.slice(0, -1).map((pt, i) =>
        lineSegment(pt.x, pt.y, revPoints[i + 1].x, revPoints[i + 1].y, '#2D4B34', `rev-line-${i}`)
      )}

      {/* Orders line segments (gold) */}
      {ordPoints.slice(0, -1).map((pt, i) =>
        lineSegment(pt.x, pt.y, ordPoints[i + 1].x, ordPoints[i + 1].y, '#D9B168', `ord-line-${i}`)
      )}

      {/* Revenue dots (green) */}
      {revPoints.map((pt, i) => (
        <View
          key={`rev-dot-${i}`}
          style={{
            position: 'absolute',
            left: pt.x - 5,
            top: pt.y - 5,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: '#2D4B34',
            borderWidth: 2,
            borderColor: '#FFFFFF',
          }}
        />
      ))}

      {/* Orders dots (gold) */}
      {ordPoints.map((pt, i) => (
        <View
          key={`ord-dot-${i}`}
          style={{
            position: 'absolute',
            left: pt.x - 4,
            top: pt.y - 4,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#D9B168',
            borderWidth: 1.5,
            borderColor: '#FFFFFF',
          }}
        />
      ))}
    </View>
  );
});

interface ChartPoint {
  label: string;
  revenue: number;
  orders: number;
}

interface OrderItem {
  id: string;
  code: string;
  date: string;
  amount: string;
  status: string;
  statusColor: string;
  textColor: string;
}

interface TopProductItem {
  id: string;
  rank: number;
  name: string;
  size: string;
  sold: number;
  image: any;
}

interface LowStockItem {
  id: string;
  name: string;
  size: string;
  stock: number;
  image: any;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('Admin');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const isMountedRef = useRef(true);

  // Dynamic Dashboard Stats State
  const [dbStats, setDbStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    productsSold: 0,
    activeCoupons: 0,
    avgOrderValue: 0,
    lowStockCount: 0,
  });

  const [salesChart, setSalesChart] = useState<ChartPoint[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [showLowStockDetail, setShowLowStockDetail] = useState(false);

  const checkAdminAuth = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const role = await AsyncStorage.getItem('user_role');
      const token = await AsyncStorage.getItem('auth_token');

      if (!token || role !== 'admin') {
        if (isMountedRef.current) {
          setTimeout(() => {
            if (isMountedRef.current) {
              Alert.alert('Unauthorized', 'You need to be an admin to access this page');
              try {
                router.replace('/(tabs)');
              } catch (navError) {
                console.error('Navigation error:', navError);
              }
            }
          }, 100);
        }
        return;
      }

      if (token && isMountedRef.current) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payloadPart = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const jsonString = Buffer.from(payloadPart, 'base64').toString('utf8');
            const tokenData = JSON.parse(jsonString);
            if (isMountedRef.current) {
              setUserName(tokenData?.name || 'Admin');
            }
          }
        } catch {
          if (isMountedRef.current) setUserName('Admin');
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  }, [router]);

  const fetchDashboardData = useCallback(async (periodParam = chartPeriod) => {
    try {
      setLoading(true);
      // Fetch dynamic stats directly from backend database endpoints
      const [statsRes, ordersRes] = await Promise.allSettled([
        apiService.get(`/admin/stats?period=${periodParam}`),
        apiService.get('/admin/orders?limit=5'),
      ]);

      if (isMountedRef.current) {
        if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
          const d = statsRes.value.data;
          const lowStockArr = Array.isArray(d.low_stock) ? d.low_stock : [];
          setDbStats({
            totalUsers: parseInt(d.total_users || 0),
            totalProducts: parseInt(d.total_products || 0),
            totalOrders: parseInt(d.total_orders || 0),
            totalRevenue: parseFloat(d.total_revenue || 0),
            productsSold: parseInt(d.products_sold || 0),
            activeCoupons: parseInt(d.active_coupons || 0),
            avgOrderValue: parseFloat(d.avg_order_value || 0),
            lowStockCount: lowStockArr.length,
          });

          // Dynamic Low Stock Items list (stock < 10)
          setLowStockItems(lowStockArr.map((p: any) => ({
            id: String(p.id),
            name: p.name || 'Product',
            size: p.size || '',
            stock: parseInt(p.left || p.stock_quantity || 0),
            image: resolveImageUrl(p.image_url) || require('../assets/images/logo.png'),
          })));

          // Dynamic Sales Overview Chart points from Database
          if (Array.isArray(d.sales_chart) && d.sales_chart.length > 0) {
            setSalesChart(d.sales_chart.map((item: any) => ({
              label: item.label || 'Date',
              revenue: parseFloat(item.revenue || 0),
              orders: parseInt(item.orders || 0),
            })));
          } else {
            setSalesChart([]);
          }

          // Dynamic Top Selling Products from Database
          if (Array.isArray(d.top_selling) && d.top_selling.length > 0) {
            setTopProducts(d.top_selling.slice(0, 5).map((p: any, idx: number) => ({
              id: String(p.id),
              rank: idx + 1,
              name: p.name || 'Product',
              size: p.size || 'Standard',
              sold: parseInt(p.sold || p.order_count || 0),
              image: resolveImageUrl(p.image_url) || require('../assets/images/logo.png'),
            })));
          } else {
            setTopProducts([]);
          }
        }

        // Dynamic Recent Orders from Database
        if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
          const ordersArray = Array.isArray(ordersRes.value.data) 
            ? ordersRes.value.data 
            : (ordersRes.value.data.orders || []);

          const formattedOrders = ordersArray.slice(0, 5).map((o: any) => {
            const rawStatus = (o.status || 'pending').toLowerCase();
            let statusColor = '#ffebee';
            let textColor = '#c62828';

            if (rawStatus === 'delivered') {
              statusColor = '#e8f5e9';
              textColor = '#2e7d32';
            } else if (rawStatus === 'shipped') {
              statusColor = '#e8f5e9';
              textColor = '#1b5e20';
            } else if (rawStatus === 'processing') {
              statusColor = '#fff3e0';
              textColor = '#e65100';
            }

            return {
              id: String(o.id),
              code: `#SA${o.id}`,
              date: o.created_at ? new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today',
              amount: parseFloat(o.total_amount || o.total || 0).toFixed(2),
              status: rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1),
              statusColor,
              textColor,
            };
          });

          setRecentOrders(formattedOrders);
        }
      }
    } catch (e) {
      console.error('Error fetching dynamic database dashboard data:', e);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [chartPeriod]);

  useEffect(() => {
    isMountedRef.current = true;
    checkAdminAuth();
    fetchDashboardData();

    return () => {
      isMountedRef.current = false;
    };
  }, [checkAdminAuth, fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handlePeriodToggle = () => {
    const nextPeriod = chartPeriod === 'daily' ? 'weekly' : chartPeriod === 'weekly' ? 'monthly' : 'daily';
    setChartPeriod(nextPeriod);
    fetchDashboardData(nextPeriod);
  };

  const handleLogout = async () => {
    if (!isMountedRef.current) return;
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_role');
      await AsyncStorage.removeItem('name');
      await AsyncStorage.removeItem('user_name');
      authEvents.notify();
      if (isMountedRef.current) {
        try {
          router.replace('/(tabs)');
        } catch (navError) {
          console.error('Navigation error during logout:', navError);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navigateTo = (route: string) => {
    setShowMoreModal(false);
    try {
      router.push(route as any);
    } catch (e) {
      console.error('Navigation error:', e);
    }
  };

  // Compute chart scaling params from live database chart data
  const maxRevenue = Math.max(...salesChart.map(c => c.revenue), 1);
  const maxOrders = Math.max(...salesChart.map(c => c.orders), 1);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Main Top Header */}
          <View style={styles.topHeader}>
            <TouchableOpacity onPress={() => setShowMoreModal(true)} style={styles.iconBtn}>
              <Ionicons name="menu-outline" size={26} color="#111827" />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerGreeting}>Welcome back, {userName} 🌿</Text>
              <Text style={styles.headerSubtitle}>Here's what's happening with your store today.</Text>
            </View>

            <View style={styles.headerRightControls}>
              <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
                <Ionicons name="refresh-outline" size={22} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateTo('/admin/profile')} style={styles.avatarBtn}>
                <Image source={require('../assets/images/logo.png')} style={styles.avatarImage} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            style={styles.scrollBody} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D4B34" colors={['#2D4B34']} />
            }
          >
            {/* Dynamic Date Filter Selector Pill */}
            <TouchableOpacity style={styles.dateSelectorPill} onPress={handlePeriodToggle}>
              <Ionicons name="calendar-outline" size={16} color="#4B5563" />
              <Text style={styles.dateSelectorText}>
                Filter: {chartPeriod.toUpperCase()} Overview
              </Text>
              <Ionicons name="chevron-down" size={16} color="#4B5563" />
            </TouchableOpacity>

            {loading && !refreshing && (
              <View style={styles.loadingBanner}>
                <ActivityIndicator size="small" color="#2D4B34" />
                <Text style={styles.loadingText}>Fetching real database metrics...</Text>
              </View>
            )}

            {/* 4 Top Metric Cards (2x2 Grid) */}
            <View style={styles.metricGrid}>
              {/* Card 1: Total Orders */}
              <TouchableOpacity style={styles.metricCard} onPress={() => navigateTo('/admin/orders')}>
                <View style={styles.metricHeaderRow}>
                  <View style={[styles.metricIconBg, { backgroundColor: '#EAF6ED' }]}>
                    <Ionicons name="bag-handle-outline" size={22} color="#2D4B34" />
                  </View>
                </View>
                <Text style={styles.metricLabel}>Total Orders</Text>
                <Text style={styles.metricValue}>{dbStats.totalOrders.toLocaleString()}</Text>
                <View style={styles.trendRow}>
                  <Ionicons name="trending-up" size={14} color="#2E7D32" />
                  <Text style={styles.trendGreen}> Database Total</Text>
                </View>
              </TouchableOpacity>

              {/* Card 2: Total Revenue */}
              <TouchableOpacity style={styles.metricCard} onPress={() => navigateTo('/admin/orders')}>
                <View style={styles.metricHeaderRow}>
                  <View style={[styles.metricIconBg, { backgroundColor: '#FEF6E6' }]}>
                    <Ionicons name="cash-outline" size={22} color="#8C6B27" />
                  </View>
                </View>
                <Text style={styles.metricLabel}>Total Revenue</Text>
                <Text style={styles.metricValue}>{formatCurrency(dbStats.totalRevenue)}</Text>
                <View style={styles.trendRow}>
                  <Ionicons name="trending-up" size={14} color="#2E7D32" />
                  <Text style={styles.trendGreen}> Database Total</Text>
                </View>
              </TouchableOpacity>

              {/* Card 3: Registered Customers */}
              <TouchableOpacity style={styles.metricCard} onPress={() => navigateTo('/admin/users')}>
                <View style={styles.metricHeaderRow}>
                  <View style={[styles.metricIconBg, { backgroundColor: '#EAF6ED' }]}>
                    <Ionicons name="person-outline" size={22} color="#2D4B34" />
                  </View>
                </View>
                <Text style={styles.metricLabel}>Total Customers</Text>
                <Text style={styles.metricValue}>{dbStats.totalUsers.toLocaleString()}</Text>
                <View style={styles.trendRow}>
                  <Ionicons name="trending-up" size={14} color="#2E7D32" />
                  <Text style={styles.trendGreen}> Registered Users</Text>
                </View>
              </TouchableOpacity>

              {/* Card 4: Products Sold */}
              <TouchableOpacity style={styles.metricCard} onPress={() => navigateTo('/admin/products')}>
                <View style={styles.metricHeaderRow}>
                  <View style={[styles.metricIconBg, { backgroundColor: '#FEF6E6' }]}>
                    <Ionicons name="cube-outline" size={22} color="#8C6B27" />
                  </View>
                </View>
                <Text style={styles.metricLabel}>Products Sold</Text>
                <Text style={styles.metricValue}>{dbStats.productsSold.toLocaleString()}</Text>
                <View style={styles.trendRow}>
                  <Ionicons name="trending-up" size={14} color="#2E7D32" />
                  <Text style={styles.trendGreen}> Items Purchased</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Sales Overview Dynamic Chart Container */}
            <View style={styles.chartContainerCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.cardTitle}>Sales Overview</Text>
                <TouchableOpacity style={styles.chartFilterPill} onPress={handlePeriodToggle}>
                  <Text style={styles.chartFilterText}>{chartPeriod.charAt(0).toUpperCase() + chartPeriod.slice(1)}</Text>
                  <Ionicons name="chevron-down" size={14} color="#374151" />
                </TouchableOpacity>
              </View>

              <View style={styles.chartLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#2D4B34' }]} />
                  <Text style={styles.legendText}>Revenue (₹)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#D9B168' }]} />
                  <Text style={styles.legendText}>Orders</Text>
                </View>
              </View>

              {/* Y-axis labels */}
              <View style={styles.yAxisLabels}>
                <Text style={styles.axisLabel}>₹{Math.round(maxRevenue).toLocaleString()}</Text>
                <Text style={styles.axisLabel}>₹{Math.round(maxRevenue * 0.5).toLocaleString()}</Text>
                <Text style={styles.axisLabel}>₹0</Text>
              </View>

              {/* Bar + Line chart */}
              <DualLineChart data={salesChart} maxRevenue={maxRevenue} maxOrders={maxOrders} />

              {/* X-Axis Date Labels */}
              <View style={styles.xAxisRow}>
                {salesChart.map((point, idx) => (
                  <Text key={idx} style={styles.axisLabel} numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {point.label.replace('May ', '')}
                  </Text>
                ))}
              </View>
            </View>

            {/* Recent Orders & Top Selling Products Row */}
            <View style={styles.sectionCardGroup}>
              {/* Recent Orders Card */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <Text style={styles.cardTitle}>Recent Orders</Text>
                  <TouchableOpacity onPress={() => navigateTo('/admin/orders')}>
                    <Text style={styles.linkGreenText}>View All</Text>
                  </TouchableOpacity>
                </View>

                {recentOrders.length === 0 ? (
                  <Text style={styles.emptyText}>No recent orders recorded</Text>
                ) : (
                  recentOrders.map(order => (
                    <View key={order.id} style={styles.orderListItem}>
                      <View style={styles.orderIconBg}>
                        <Ionicons name="cube-outline" size={18} color="#6B7280" />
                      </View>
                      <View style={styles.orderMetaCol}>
                        <Text style={styles.orderCodeText}>{order.code}</Text>
                        <Text style={styles.orderSubText}>{order.date}  •  ₹{order.amount}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: order.statusColor }]}>
                        <Text style={[styles.statusBadgeText, { color: order.textColor }]}>{order.status}</Text>
                      </View>
                    </View>
                  ))
                )}

                <TouchableOpacity style={styles.fullWidthBtn} onPress={() => navigateTo('/admin/orders')}>
                  <Text style={styles.fullWidthBtnText}>View All Orders</Text>
                </TouchableOpacity>
              </View>

              {/* Top Selling Products Card */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <Text style={styles.cardTitle}>Top Selling Products</Text>
                  <TouchableOpacity onPress={() => navigateTo('/admin/products')}>
                    <Text style={styles.linkGreenText}>View All</Text>
                  </TouchableOpacity>
                </View>

                {topProducts.length === 0 ? (
                  <Text style={styles.emptyText}>No top selling products recorded</Text>
                ) : (
                  topProducts.map(prod => (
                    <View key={prod.id} style={styles.topProdListItem}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>{prod.rank}</Text>
                      </View>
                      <Image source={prod.image} style={styles.prodThumb} resizeMode="cover" />
                      <View style={styles.prodMetaCol}>
                        <Text style={styles.prodTitleText} numberOfLines={1}>{prod.name}</Text>
                        <Text style={styles.prodSubText}>{prod.size}</Text>
                      </View>
                      <View style={styles.soldCol}>
                        <Text style={styles.soldCountText}>{prod.sold}</Text>
                        <Text style={styles.soldLabelText}>Sold</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* Dynamic Low Stock Alert Card — shows actual products with stock < 10 */}
            <View style={styles.lowStockCard}>
              <TouchableOpacity
                style={styles.lowStockBanner}
                onPress={() => setShowLowStockDetail(prev => !prev)}
              >
                <View style={styles.lowStockLeft}>
                  <View style={styles.warningIconBg}>
                    <Ionicons name="warning-outline" size={20} color="#DC2626" />
                  </View>
                  <View>
                    <Text style={styles.lowStockTitle}>Low Stock Alert</Text>
                    <Text style={styles.lowStockSub}>
                      {dbStats.lowStockCount} {dbStats.lowStockCount === 1 ? 'product is' : 'products are'} running low
                    </Text>
                  </View>
                </View>
                <View style={styles.lowStockRight}>
                  <Text style={styles.lowStockLinkText}>{showLowStockDetail ? 'Hide' : 'View All'}</Text>
                  <Ionicons name={showLowStockDetail ? 'chevron-up' : 'chevron-forward'} size={16} color="#DC2626" />
                </View>
              </TouchableOpacity>

              {showLowStockDetail && lowStockItems.length > 0 && (
                <View style={styles.lowStockList}>
                  {lowStockItems.map(item => (
                    <View key={item.id} style={styles.lowStockItem}>
                      <Image source={item.image} style={styles.lowStockThumb} resizeMode="cover" />
                      <View style={styles.lowStockMeta}>
                        <Text style={styles.lowStockItemName} numberOfLines={1}>{item.name}</Text>
                        {item.size ? <Text style={styles.lowStockItemSize}>{item.size}</Text> : null}
                      </View>
                      <View style={[
                        styles.stockBadge,
                        { backgroundColor: item.stock <= 3 ? '#FEE2E2' : '#FFF3CD' },
                      ]}>
                        <Text style={[
                          styles.stockBadgeText,
                          { color: item.stock <= 3 ? '#DC2626' : '#92400E' },
                        ]}>
                          {item.stock} left
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {showLowStockDetail && lowStockItems.length === 0 && (
                <Text style={[styles.emptyText, { padding: 12 }]}>All products have sufficient stock</Text>
              )}
            </View>

            {/* Secondary 4 Stats Row */}
            <View style={styles.secondaryStatsGrid}>
              <TouchableOpacity style={styles.subStatCard} onPress={() => navigateTo('/admin/users')}>
                <View style={[styles.subStatIconBg, { backgroundColor: '#EAF6ED' }]}>
                  <Ionicons name="person-outline" size={20} color="#2D4B34" />
                </View>
                <Text style={styles.subStatLabel}>Total Customers</Text>
                <Text style={styles.subStatValue}>{dbStats.totalUsers.toLocaleString()}</Text>
                <Text style={styles.subStatTrendGreen}>Registered Accounts</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.subStatCard} onPress={() => navigateTo('/admin/coupons')}>
                <View style={[styles.subStatIconBg, { backgroundColor: '#FEF6E6' }]}>
                  <Ionicons name="ticket-outline" size={20} color="#8C6B27" />
                </View>
                <Text style={styles.subStatLabel}>Active Coupons</Text>
                <Text style={styles.subStatValue}>{dbStats.activeCoupons}</Text>
                <Text style={styles.subStatLink}>View all coupons →</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.subStatCard} onPress={() => navigateTo('/admin/orders')}>
                <View style={[styles.subStatIconBg, { backgroundColor: '#EAF6ED' }]}>
                  <Ionicons name="trending-up-outline" size={20} color="#2D4B34" />
                </View>
                <Text style={styles.subStatLabel}>Avg. Order Value</Text>
                <Text style={styles.subStatValue}>₹{dbStats.avgOrderValue.toFixed(2)}</Text>
                <Text style={styles.subStatTrendGreen}>Per Completed Order</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.subStatCard} onPress={() => navigateTo('/admin/products')}>
                <View style={[styles.subStatIconBg, { backgroundColor: '#FEF6E6' }]}>
                  <Ionicons name="cube-outline" size={20} color="#8C6B27" />
                </View>
                <Text style={styles.subStatLabel}>Total Products</Text>
                <Text style={styles.subStatValue}>{dbStats.totalProducts}</Text>
                <Text style={styles.subStatLink}>In Catalog →</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Bottom Fixed Navigation Bar */}
          <View style={styles.bottomTabBar}>
            <TouchableOpacity style={styles.tabItem} onPress={() => {}}>
              <Ionicons name="grid" size={22} color="#2D4B34" />
              <Text style={[styles.tabLabel, styles.tabLabelActive]}>Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabItem} onPress={() => navigateTo('/admin/orders')}>
              <Ionicons name="bag-handle-outline" size={22} color="#6B7280" />
              <Text style={styles.tabLabel}>Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabItem} onPress={() => navigateTo('/admin/products')}>
              <Ionicons name="cube-outline" size={22} color="#6B7280" />
              <Text style={styles.tabLabel}>Products</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabItem} onPress={() => navigateTo('/admin/users')}>
              <Ionicons name="people-outline" size={22} color="#6B7280" />
              <Text style={styles.tabLabel}>Customers</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabItem} onPress={() => setShowMoreModal(true)}>
              <Ionicons name="ellipsis-horizontal-outline" size={22} color="#6B7280" />
              <Text style={styles.tabLabel}>More</Text>
            </TouchableOpacity>
          </View>

          {/* Slide-Up Navigation Modal for "More" Menu (Shared Component) */}
          <AdminMoreModal
            visible={showMoreModal}
            onClose={() => setShowMoreModal(false)}
          />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 12) + 6 : 10,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  headerGreeting: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  scrollBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  dateSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 16,
  },
  dateSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
  },

  /* 4 Metric Cards Grid */
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
  },
  metricHeaderRow: {
    marginBottom: 10,
  },
  metricIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendGreen: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },

  /* Chart Card */
  chartContainerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  chartFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chartFilterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  chartLegendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  chartArea: {
    height: 180,
    position: 'relative',
    justifyContent: 'space-between',
  },
  chartGridLine: {
    height: 1,
    backgroundColor: '#F3F4F6',
    width: '100%',
  },
  yAxisOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 20,
    right: 0,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  axisLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  chartLinePlotArea: {
    position: 'absolute',
    top: 0,
    bottom: 20,
    left: 0,
    right: 35,
  },
  chartPointGreen: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2D4B34',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chartPointTan: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D9B168',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 35,
    marginTop: 8,
  },

  yAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  /* Section Cards Group */
  sectionCardGroup: {
    gap: 16,
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 16,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  linkGreenText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D4B34',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  orderListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orderIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  orderMetaCol: {
    flex: 1,
  },
  orderCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  orderSubText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fullWidthBtn: {
    marginTop: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  fullWidthBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  /* Top Selling Products List */
  topProdListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EAF6ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D4B34',
  },
  prodThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
  },
  prodMetaCol: {
    flex: 1,
  },
  prodTitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  prodSubText: {
    fontSize: 11,
    color: '#6B7280',
  },
  soldCol: {
    alignItems: 'flex-end',
  },
  soldCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  soldLabelText: {
    fontSize: 10,
    color: '#6B7280',
  },

  /* Low Stock Card */
  lowStockCard: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE3E3',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  lowStockBanner: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lowStockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  warningIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lowStockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  lowStockSub: {
    fontSize: 12,
    color: '#B91C1C',
  },
  lowStockRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lowStockLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  lowStockList: {
    borderTopWidth: 1,
    borderTopColor: '#FFE3E3',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  lowStockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
    gap: 10,
  },
  lowStockThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  lowStockMeta: {
    flex: 1,
  },
  lowStockItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F1D1D',
  },
  lowStockItemSize: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 1,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Secondary Stats Grid */
  secondaryStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  subStatCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
  },
  subStatIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  subStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  subStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subStatTrendGreen: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  subStatLink: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2D4B34',
  },

  /* Bottom Tab Bar */
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 76 : 64,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 16 : 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#2D4B34',
    fontWeight: '700',
  },

  /* More Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  modalMenuItem: {
    width: (SCREEN_WIDTH - 64) / 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalMenuText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginTop: 6,
    textAlign: 'center',
  },
  modalLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  modalLogoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
});