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
    multiSelect = false,
    selectedCategories = [],
    onSelectMultiple
}: CategorySelectorProps & {
    multiSelect?: boolean;
    selectedCategories?: string[];
    onSelectMultiple?: (categories: { id: number; name: string }[]) => void;
}) {
    const { mainCategories, subCategories, loading, error, fetchCategories } = useCategories();
    // Local state for multi-select
    const [tempSelected, setTempSelected] = React.useState<string[]>([]);

    React.useEffect(() => {
        if (visible && multiSelect) {
            setTempSelected(selectedCategories || []);
        }

        // Force refresh categories when modal opens to ensure we have latest data
        if (visible) {
            fetchCategories(true);
        }
    }, [visible, multiSelect, selectedCategories]);

    const handleToggle = (category: { id: number; name: string }) => {
        if (multiSelect) {
            setTempSelected(prev => {
                if (prev.includes(category.name)) {
                    return prev.filter(c => c !== category.name);
                } else {
                    return [...prev, category.name];
                }
            });
        } else {
            onSelect(category);
        }
    };

    const handleDone = () => {
        if (multiSelect && onSelectMultiple) {
            const selectedObjs: { id: number, name: string }[] = [];
            // Reconstruct objects from names (a bit inefficient but safe)
            const allCats = [...mainCategories, ...Object.values(subCategories).flat()];
            tempSelected.forEach(name => {
                const found = allCats.find(c => c.name === name);
                if (found) selectedObjs.push(found);
            });
            onSelectMultiple(selectedObjs);
        }
        onClose();
    };

    // Helper to check if selected
    const isSelected = (name: string) => {
        if (multiSelect) return tempSelected.includes(name);
        return selectedCategory === name;
    };

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
                        <Text style={styles.modalTitle}>{multiSelect ? 'Select Categories' : 'Select Category'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {multiSelect && (
                                <TouchableOpacity onPress={handleDone} style={{ marginRight: 16 }}>
                                    <Text style={{ color: '#007AFF', fontWeight: '600', fontSize: 16 }}>Done</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView style={styles.categoryList}>
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <Text style={styles.loadingText}>Loading categories...</Text>
                            </View>
                        ) : error ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>Error loading categories: {error}</Text>
                                <TouchableOpacity
                                    style={styles.retryButton}
                                    onPress={() => fetchCategories()}
                                >
                                    <Text style={styles.retryButtonText}>Retry</Text>
                                </TouchableOpacity>
                            </View>
                        ) : mainCategories.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No categories available</Text>
                            </View>
                        ) : (
                            mainCategories.map(category => (
                                <View key={category.id}>
                                    <TouchableOpacity
                                        style={[
                                            styles.categoryItem,
                                            isSelected(category.name) && styles.selectedCategory
                                        ]}
                                        onPress={() => handleToggle(category)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {multiSelect && (
                                                <Ionicons
                                                    name={isSelected(category.name) ? "checkbox" : "square-outline"}
                                                    size={24}
                                                    color={isSelected(category.name) ? "#007bff" : "#666"}
                                                    style={{ marginRight: 12 }}
                                                />
                                            )}
                                            <Text style={[
                                                styles.categoryName,
                                                isSelected(category.name) && styles.selectedCategoryText
                                            ]}>
                                                {category.name}
                                            </Text>
                                        </View>
                                        {subCategories[category.id]?.length > 0 && !multiSelect && (
                                            <Ionicons name="chevron-forward" size={20} color="#666" />
                                        )}
                                    </TouchableOpacity>
                                    {subCategories[category.id]?.map(subCategory => (
                                        <TouchableOpacity
                                            key={subCategory.id}
                                            style={[
                                                styles.categoryItem,
                                                styles.subCategoryItem,
                                                isSelected(subCategory.name) && styles.selectedCategory
                                            ]}
                                            onPress={() => handleToggle(subCategory)}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                {multiSelect && (
                                                    <Ionicons
                                                        name={isSelected(subCategory.name) ? "checkbox" : "square-outline"}
                                                        size={24}
                                                        color={isSelected(subCategory.name) ? "#007bff" : "#666"}
                                                        style={{ marginRight: 12 }}
                                                    />
                                                )}
                                                <Text style={[
                                                    styles.categoryName,
                                                    isSelected(subCategory.name) && styles.selectedCategoryText
                                                ]}>
                                                    {subCategory.name}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ))
                        )}
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
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        padding: 20,
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#dc3545',
        textAlign: 'center',
        marginBottom: 10,
    },
    retryButton: {
        backgroundColor: '#007bff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
}); 