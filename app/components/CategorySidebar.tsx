import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCategories } from '../CategoryContext';

export default function CategorySidebar() {
    const router = useRouter();
    const { mainCategories, getSubcategories } = useCategories();
    const [expandedCategory, setExpandedCategory] = React.useState<number | null>(null);

    const handleCategoryPress = (categoryId: number, categoryName: string) => {
        router.push({
            pathname: '/category/[id]',
            params: { id: categoryId, name: categoryName }
        });
    };

    return (
        <View style={styles.sidebar}>
            <View style={styles.header}>
                <Text style={styles.title}>Categories</Text>
            </View>
            <ScrollView style={styles.categoriesList}>
                {mainCategories.map((category) => (
                    <View key={category.id}>
                        <TouchableOpacity
                            style={styles.categoryItem}
                            onPress={() => handleCategoryPress(category.id, category.name)}
                        >
                            <Text style={styles.categoryName}>{category.name}</Text>
                            <TouchableOpacity
                                onPress={() => setExpandedCategory(
                                    expandedCategory === category.id ? null : category.id
                                )}
                            >
                                <Ionicons
                                    name={expandedCategory === category.id ? 'chevron-up' : 'chevron-down'}
                                    size={20}
                                    color="#666"
                                />
                            </TouchableOpacity>
                        </TouchableOpacity>
                        {expandedCategory === category.id && (
                            <View style={styles.subcategoriesList}>
                                {getSubcategories(category.id).map((subcategory) => (
                                    <TouchableOpacity
                                        key={subcategory.id}
                                        style={styles.subcategoryItem}
                                        onPress={() => handleCategoryPress(subcategory.id, subcategory.name)}
                                    >
                                        <Text style={styles.subcategoryName}>{subcategory.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    sidebar: {
        width: 250,
        backgroundColor: '#fff',
        borderRightWidth: 1,
        borderRightColor: '#f0f0f0',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    categoriesList: {
        flex: 1,
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    categoryName: {
        fontSize: 16,
        color: '#000',
    },
    subcategoriesList: {
        backgroundColor: '#f8f9fa',
    },
    subcategoryItem: {
        padding: 12,
        paddingLeft: 32,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    subcategoryName: {
        fontSize: 14,
        color: '#666',
    },
}); 