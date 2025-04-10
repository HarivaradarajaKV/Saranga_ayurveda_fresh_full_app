import React from 'react';
import { View, Text, TextInput, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../app/(tabs)/CartContext';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const { addToCart } = useCart();
  const navigation = useNavigation();

  const products = [
    { id: 1, name: 'Natural Glow Foundation', category: 'Makeup', price: 2499, image: 'https://picsum.photos/200/300?random=31' },
    { id: 2, name: 'Hydrating Serum', category: 'Skincare', price: 1999, image: 'https://picsum.photos/200/300?random=32' },
    { id: 3, name: 'Volumizing Shampoo', category: 'Haircare', price: 999, image: 'https://picsum.photos/200/300?random=33' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 16 }}>
      {/* Header Banner */}
      <View style={{ backgroundColor: '#f8d7da', padding: 16, borderRadius: 15, marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#d63384' }}>Exclusive Beauty Deals!</Text>
        <Text style={{ color: '#6c757d', fontSize: 12 }}>Get up to 50% off on premium cosmetics.</Text>
      </View>
      
      {/* Search Bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f1f1', borderRadius: 10, padding: 8, marginBottom: 16 }}>
        <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
        <TextInput placeholder="Search for beauty products..." style={{ flex: 1, fontSize: 14 }} />
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Category Section */}
        <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>Shop by Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {["Skincare", "Makeup", "Haircare", "Fragrances"].map((category, index) => (
            <TouchableOpacity key={index} style={{ marginRight: 12, alignItems: 'center' }}>
              <View style={{ width: 60, height: 60, backgroundColor: '#f8d7da', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ color: '#d63384', fontSize: 12 }}>{category}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Featured Products */}
        <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>Trending Now</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {products.map((product) => (
            <TouchableOpacity key={product.id} onPress={() => {
              console.log('Navigating to ProductDescription with product:', product);
              navigation.navigate('ProductDescription', { product });
            }}>
              <View style={{ marginRight: 15, width: 150, backgroundColor: '#fff', borderRadius: 10, padding: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 }}>
                <Image source={{ uri: product.image }} style={{ width: 130, height: 130, borderRadius: 10 }} />
                <Text style={{ marginTop: 5, fontSize: 14, fontWeight: 'bold' }}>{product.name}</Text>
                <Text style={{ color: '#d63384', fontWeight: 'bold' }}>₹{product.price}</Text>
                <TouchableOpacity onPress={() => addToCart(product)} style={{ marginTop: 10, backgroundColor: '#007bff', padding: 10, borderRadius: 5, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 14 }}>Add to Cart</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
};

export default HomeScreen; 