import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCategories } from '../../CategoryContext';

interface CategorySelectorProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (category: { id: number; name: string }) => void;
    selectedCategory?: string;
}

export default function CategorySelector({
    visible,
    onClose,
    onSelect,
    selectedCategory,
}: CategorySelectorProps) {
    const { mainCategories, subCategories } = useCategories();

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Category</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.categoryList}>
                        {mainCategories.map(category => (
                            <View key={category.id}>
                                <TouchableOpacity
                                    style={[
                                        styles.categoryItem,
                                        selectedCategory === category.name && styles.selectedCategory
                                    ]}
                                    onPress={() => onSelect(category)}
                                >
                                    <Text style={[
                                        styles.categoryName,
                                        selectedCategory === category.name && styles.selectedCategoryText
                                    ]}>
                                        {category.name}
                                    </Text>
                                    {subCategories[category.id]?.length > 0 && (
                                        <Ionicons name="chevron-forward" size={20} color="#666" />
                                    )}
                                </TouchableOpacity>
                                {subCategories[category.id]?.map(subCategory => (
                                    <TouchableOpacity
                                        key={subCategory.id}
                                        style={[
                                            styles.categoryItem,
                                            styles.subCategoryItem,
                                            selectedCategory === subCategory.name && styles.selectedCategory
                                        ]}
                                        onPress={() => onSelect(subCategory)}
                                    >
                                        <Text style={[
                                            styles.categoryName,
                                            selectedCategory === subCategory.name && styles.selectedCategoryText
                                        ]}>
                                            {subCategory.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    categoryList: {
        padding: 16,
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    subCategoryItem: {
        paddingLeft: 32,
        backgroundColor: '#f8f9fa',
    },
    categoryName: {
        fontSize: 16,
        color: '#000',
    },
    selectedCategory: {
        backgroundColor: '#e3f2fd',
    },
    selectedCategoryText: {
        color: '#007bff',
        fontWeight: '600',
    },
}); 