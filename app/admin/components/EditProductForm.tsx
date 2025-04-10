import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import CategorySelector from './CategorySelector';

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    image_url: string;
    image_url2?: string;
    image_url3?: string;
    usage_instructions?: string;
    size?: string;
    benefits?: string;
    ingredients?: string;
    product_details?: string;
    stock_quantity: number;
    created_at: string;
    offer_percentage: number;
}

interface EditProductFormProps {
    product: Product;
    onSubmit: (updatedProduct: Partial<Product>) => Promise<void>;
    onCancel: () => void;
}

const EditProductForm: React.FC<EditProductFormProps> = ({
    product,
    onSubmit,
    onCancel,
}) => {
    const [editedProduct, setEditedProduct] = useState<Partial<Product>>({
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        stock_quantity: product.stock_quantity,
        usage_instructions: product.usage_instructions,
        size: product.size,
        benefits: product.benefits,
        ingredients: product.ingredients,
        product_details: product.product_details,
        offer_percentage: product.offer_percentage,
    });
    const [selectedImages, setSelectedImages] = useState<string[]>([
        product.image_url,
        product.image_url2 || '',
        product.image_url3 || '',
    ]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [activeSection, setActiveSection] = useState('basic');

    const handleImagePick = async (index: number) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                const newSelectedImages = [...selectedImages];
                newSelectedImages[index] = result.assets[0].uri;
                setSelectedImages(newSelectedImages);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleCategorySelect = (category: { id: number; name: string }) => {
        setEditedProduct(prev => ({ ...prev, category: category.name }));
        setShowCategoryModal(false);
    };

    const handleSubmit = async () => {
        try {
            await onSubmit(editedProduct);
        } catch (error) {
            console.error('Error updating product:', error);
            Alert.alert('Error', 'Failed to update product');
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Edit Product</Text>
                <TouchableOpacity onPress={onCancel}>
                    <Ionicons name="close" size={24} color="black" />
                </TouchableOpacity>
            </View>

            <View style={styles.imageSection}>
                {selectedImages.map((uri, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.imageContainer}
                        onPress={() => handleImagePick(index)}
                    >
                        {uri ? (
                            <Image source={{ uri }} style={styles.image} />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <Ionicons name="add" size={24} color="#666" />
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeSection === 'basic' && styles.activeTab]}
                    onPress={() => setActiveSection('basic')}
                >
                    <Text style={[styles.tabText, activeSection === 'basic' && styles.activeTabText]}>
                        Basic Info
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeSection === 'details' && styles.activeTab]}
                    onPress={() => setActiveSection('details')}
                >
                    <Text style={[styles.tabText, activeSection === 'details' && styles.activeTabText]}>
                        Details
                    </Text>
                </TouchableOpacity>
            </View>

            {activeSection === 'basic' ? (
                <View style={styles.formSection}>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Product Name</Text>
                        <TextInput
                            style={styles.input}
                            value={editedProduct.name}
                            onChangeText={(text) => setEditedProduct({ ...editedProduct, name: text })}
                            placeholder="Enter product name"
                            placeholderTextColor="#999"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={editedProduct.description}
                            onChangeText={(text) => setEditedProduct({ ...editedProduct, description: text })}
                            placeholder="Enter product description"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Price</Text>
                        <TextInput
                            style={styles.input}
                            value={String(editedProduct.price)}
                            onChangeText={(text) => {
                                const numericValue = text.replace(/[^0-9.]/g, '');
                                const parts = numericValue.split('.');
                                const formattedValue = parts[0] + (parts.length > 1 ? '.' + parts[1].slice(0, 2) : '');
                                setEditedProduct({ ...editedProduct, price: parseFloat(formattedValue) || 0 });
                            }}
                            placeholder="Enter price"
                            placeholderTextColor="#999"
                            keyboardType="decimal-pad"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Stock Quantity</Text>
                        <TextInput
                            style={styles.input}
                            value={String(editedProduct.stock_quantity)}
                            onChangeText={(text) => {
                                const numericValue = text.replace(/[^0-9]/g, '');
                                setEditedProduct({ ...editedProduct, stock_quantity: parseInt(numericValue) || 0 });
                            }}
                            placeholder="Enter stock quantity"
                            placeholderTextColor="#999"
                            keyboardType="number-pad"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Offer Percentage</Text>
                        <TextInput
                            style={styles.input}
                            value={String(editedProduct.offer_percentage || 0)}
                            onChangeText={(text) => {
                                const numericValue = text.replace(/[^0-9]/g, '');
                                const percentage = parseInt(numericValue) || 0;
                                const validPercentage = Math.min(Math.max(percentage, 0), 100);
                                setEditedProduct({ ...editedProduct, offer_percentage: validPercentage });
                            }}
                            placeholder="Enter offer percentage (0-100)"
                            placeholderTextColor="#999"
                            keyboardType="number-pad"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.input, styles.categorySelector]}
                        onPress={() => setShowCategoryModal(true)}
                    >
                        <Text style={editedProduct.category ? styles.categoryText : styles.placeholderText}>
                            {editedProduct.category || 'Select Category'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.formSection}>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Size</Text>
                        <TextInput
                            style={styles.input}
                            value={editedProduct.size}
                            onChangeText={(text) => {
                                const formattedSize = text.toUpperCase().trim().replace(/\s+/g, ' ');
                                setEditedProduct({ ...editedProduct, size: formattedSize });
                            }}
                            placeholder="Enter size"
                            placeholderTextColor="#999"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Usage Instructions</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={editedProduct.usage_instructions}
                            onChangeText={(text) => setEditedProduct({ ...editedProduct, usage_instructions: text })}
                            placeholder="Enter usage instructions"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Benefits</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={editedProduct.benefits}
                            onChangeText={(text) => setEditedProduct({ ...editedProduct, benefits: text })}
                            placeholder="Enter benefits"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Ingredients</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={editedProduct.ingredients}
                            onChangeText={(text) => setEditedProduct({ ...editedProduct, ingredients: text })}
                            placeholder="Enter ingredients"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Additional Details</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={editedProduct.product_details}
                            onChangeText={(text) => setEditedProduct({ ...editedProduct, product_details: text })}
                            placeholder="Enter additional product details"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                        />
                    </View>
                </View>
            )}

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                    <Text style={styles.submitButtonText}>Save Changes</Text>
                </TouchableOpacity>
            </View>

            <CategorySelector
                visible={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                onSelect={handleCategorySelect}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    imageSection: {
        flexDirection: 'row',
        padding: 16,
        gap: 8,
    },
    imageContainer: {
        width: 100,
        height: 100,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#007AFF',
    },
    tabText: {
        fontSize: 16,
        color: '#666',
    },
    activeTabText: {
        color: '#007AFF',
        fontWeight: '600',
    },
    formSection: {
        padding: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
        color: '#333',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    categorySelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryText: {
        fontSize: 16,
        color: '#333',
    },
    placeholderText: {
        fontSize: 16,
        color: '#999',
    },
    buttonContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 16,
    },
    cancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
    },
    submitButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#007AFF',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
    },
    submitButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
});

export default EditProductForm; 