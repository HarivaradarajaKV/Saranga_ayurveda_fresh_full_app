import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';

interface Category {
    id: number;
    name: string;
    description: string;
    product_count: number;
    created_at: string;
}

export default function AdminCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', description: '' });
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const fetchCategories = async () => {
        try {
            const response = await apiService.getAdminCategories();
            if (response.data && Array.isArray(response.data)) {
                setCategories(response.data as Category[]);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            Alert.alert('Error', 'Failed to fetch categories');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchCategories();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleAddCategory = async () => {
        if (!newCategory.name.trim()) {
            Alert.alert('Error', 'Category name is required');
            return;
        }

        try {
            const response = await apiService.post('/admin/categories', newCategory);
            if (response.error) {
                throw new Error(response.error);
            }
            setNewCategory({ name: '', description: '' });
            await fetchCategories();
        } catch (error) {
            console.error('Error adding category:', error);
            Alert.alert('Error', 'Failed to add category');
        }
    };

    const handleUpdateCategory = async () => {
        if (!editingCategory) return;

        try {
            const response = await apiService.updateCategory(editingCategory.id, editingCategory);
            if (response.error) {
                throw new Error(response.error);
            }
            setEditingCategory(null);
            await fetchCategories();
        } catch (error) {
            console.error('Error updating category:', error);
            Alert.alert('Error', 'Failed to update category');
        }
    };

    const handleDeleteCategory = async (categoryId: number) => {
        Alert.alert(
            'Delete Category',
            'Are you sure you want to delete this category?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await apiService.deleteCategory(categoryId);
                            if (response.error) {
                                throw new Error(response.error);
                            }
                            await fetchCategories();
                        } catch (error) {
                            console.error('Error deleting category:', error);
                            Alert.alert('Error', 'Failed to delete category');
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF69B4" />
            </View>
        );
    }

    return (
        <>
            <Stack.Screen 
                options={{
                    title: 'Categories',
                    headerRight: () => (
                        <TouchableOpacity 
                            style={styles.headerButton}
                            onPress={() => setNewCategory({ name: '', description: '' })}
                        >
                            <Ionicons name="add" size={24} color="#000" />
                        </TouchableOpacity>
                    ),
                }}
            />
            <ScrollView 
                style={styles.container}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.addCategorySection}>
                    <Text style={styles.sectionTitle}>Add New Category</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Category Name"
                        value={newCategory.name}
                        onChangeText={(text) => setNewCategory(prev => ({ ...prev, name: text }))}
                    />
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Description"
                        value={newCategory.description}
                        onChangeText={(text) => setNewCategory(prev => ({ ...prev, description: text }))}
                        multiline
                    />
                    <TouchableOpacity 
                        style={styles.addButton}
                        onPress={handleAddCategory}
                    >
                        <Text style={styles.addButtonText}>Add Category</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.categoriesSection}>
                    <Text style={styles.sectionTitle}>All Categories</Text>
                    {categories.map((category) => (
                        <View key={category.id} style={styles.categoryCard}>
                            {editingCategory?.id === category.id ? (
                                <View style={styles.editForm}>
                                    <TextInput
                                        style={styles.input}
                                        value={editingCategory.name}
                                        onChangeText={(text) => 
                                            setEditingCategory(prev => prev ? { ...prev, name: text } : null)
                                        }
                                    />
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        value={editingCategory.description}
                                        onChangeText={(text) => 
                                            setEditingCategory(prev => prev ? { ...prev, description: text } : null)
                                        }
                                        multiline
                                    />
                                    <View style={styles.editActions}>
                                        <TouchableOpacity 
                                            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                                            onPress={handleUpdateCategory}
                                        >
                                            <Text style={styles.actionButtonText}>Save</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.actionButton, { backgroundColor: '#666' }]}
                                            onPress={() => setEditingCategory(null)}
                                        >
                                            <Text style={styles.actionButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <>
                                    <View style={styles.categoryHeader}>
                                        <Text style={styles.categoryName}>{category.name}</Text>
                                        <View style={styles.categoryActions}>
                                            <TouchableOpacity 
                                                onPress={() => setEditingCategory(category)}
                                                style={styles.iconButton}
                                            >
                                                <Ionicons name="create" size={20} color="#666" />
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                onPress={() => handleDeleteCategory(category.id)}
                                                style={styles.iconButton}
                                            >
                                                <Ionicons name="trash" size={20} color="#DC143C" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <Text style={styles.categoryDescription}>{category.description}</Text>
                                    <View style={styles.categoryStats}>
                                        <Text style={styles.productCount}>
                                            {category.product_count} Products
                                        </Text>
                                        <Text style={styles.dateCreated}>
                                            Created: {new Date(category.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerButton: {
        marginRight: 15,
    },
    addCategorySection: {
        backgroundColor: '#fff',
        padding: 16,
        margin: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    categoriesSection: {
        padding: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 16,
    },
    input: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    addButton: {
        backgroundColor: '#FF69B4',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    categoryCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        flex: 1,
    },
    categoryActions: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        padding: 8,
    },
    categoryDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    categoryStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    productCount: {
        fontSize: 14,
        color: '#FF69B4',
        fontWeight: '600',
    },
    dateCreated: {
        fontSize: 12,
        color: '#666',
    },
    editForm: {
        gap: 8,
    },
    editActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 8,
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
}); 