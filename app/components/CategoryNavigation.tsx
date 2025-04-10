import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCategories } from '../CategoryContext';

export default function CategoryNavigation() {
    const router = useRouter();
    const { mainCategories } = useCategories();

    const handleCategoryPress = (categoryId: number, categoryName: string) => {
        router.push({
            pathname: '/category/[id]',
            params: { id: categoryId, name: categoryName }
        });
    };

    const getCategoryIcon = (categoryName: string): keyof typeof Ionicons.glyphMap => {
        const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
            'Skincare': 'water',
            'Makeup': 'color-palette',
            'Haircare': 'cut',
            'Fragrances': 'flower',
            'Bath & Body': 'body',
            'Organic': 'leaf',
            'Tools': 'brush',
            'Sets': 'gift',
            'Face': 'happy',
            'Eyes': 'eye',
            'Lips': 'heart',
            'Nails': 'hand-left',
            'Sun Care': 'sunny',
            'Natural': 'leaf',
            'Korean': 'globe',
            'Luxury': 'diamond'
        };
        return iconMap[categoryName] || 'apps';
    };

    return (
        <View style={styles.container}>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {mainCategories.map((category) => (
                    <TouchableOpacity
                        key={category.id}
                        style={[styles.categoryChip]}
                        onPress={() => handleCategoryPress(category.id, category.name)}
                        activeOpacity={0.7}
                    >
                        <Ionicons 
                            name={getCategoryIcon(category.name)} 
                            size={20} 
                            color="#FF69B4" 
                        />
                        <Text style={styles.categoryName}>{category.name}</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{category.product_count || 0}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    scrollContent: {
        paddingHorizontal: 15,
        gap: 10,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff5f7',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FFE0EB',
        gap: 8,
    },
    categoryName: {
        fontSize: 14,
        color: '#FF69B4',
        fontWeight: '500',
    },
    badge: {
        backgroundColor: '#FF69B4',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
}); 