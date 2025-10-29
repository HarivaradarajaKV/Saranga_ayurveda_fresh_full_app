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
import { apiService } from '../../services/api';

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
    onSubmit: (formData: FormData) => Promise<void>;
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
        product.image_url || '',
        product.image_url2 || '',
        product.image_url3 || '',
    ]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [activeSection, setActiveSection] = useState('basic');

    // Update selectedImages when product changes
    useEffect(() => {
        setSelectedImages([
            product.image_url || '',
            product.image_url2 || '',
            product.image_url3 || '',
        ]);
    }, [product.image_url, product.image_url2, product.image_url3]);

    const handleImagePick = async (index: number) => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Permission Required', 'Please allow access to your photo library');
                return;
            }

            // Show aspect ratio options for more flexible cropping
            Alert.alert(
                'Select Image Aspect Ratio',
                'Choose the aspect ratio for your image crop:',
                [
                    {
                        text: 'Square (1:1)',
                        onPress: () => pickImageWithAspect(index, [1, 1])
                    },
                    {
                        text: 'Landscape (4:3)',
                        onPress: () => pickImageWithAspect(index, [4, 3])
                    },
                    {
                        text: 'Portrait (3:4)',
                        onPress: () => pickImageWithAspect(index, [3, 4])
                    },
                    {
                        text: 'Wide (16:9)',
                        onPress: () => pickImageWithAspect(index, [16, 9])
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    }
                ]
            );
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const pickImageWithAspect = async (index: number, aspect: [number, number]) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: aspect, // Flexible aspect ratio based on user choice
                quality: 0.95, // Higher quality for better images
                allowsMultipleSelection: false,
                exif: false, // Disable EXIF data to reduce file size
                base64: false, // Don't include base64 to reduce memory usage
            });

            if (!result.canceled && result.assets[0]) {
                const newSelectedImages = [...selectedImages];
                newSelectedImages[index] = result.assets[0].uri;
                setSelectedImages(newSelectedImages);
                console.log('Image selected successfully:', result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const handleImageRemove = (index: number) => {
        Alert.alert(
            'Remove Image',
            'Are you sure you want to remove this image?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        const newSelectedImages = [...selectedImages];
                        newSelectedImages[index] = '';
                        setSelectedImages(newSelectedImages);
                    },
                },
            ]
        );
    };

    const handleCategorySelect = (category: { id: number; name: string }) => {
        setEditedProduct(prev => ({ ...prev, category: category.name }));
        setShowCategoryModal(false);
    };

    const handleSubmit = async () => {
        try {
            // Create FormData for image uploads
            const formData = new FormData();
            
            // Add basic product data
            formData.append('name', editedProduct.name || '');
            formData.append('description', editedProduct.description || '');
            formData.append('price', String(editedProduct.price || 0));
            formData.append('stock_quantity', String(editedProduct.stock_quantity || 0));
            formData.append('offer_percentage', String(editedProduct.offer_percentage || 0));
            formData.append('usage_instructions', editedProduct.usage_instructions || '');
            formData.append('size', editedProduct.size || '');
            formData.append('benefits', editedProduct.benefits || '');
            formData.append('ingredients', editedProduct.ingredients || '');
            formData.append('product_details', editedProduct.product_details || '');
            
            console.log('Selected images for update:', selectedImages);
            
            // Handle images - send all image data to backend
            selectedImages.forEach((imageUri, index) => {
                if (imageUri && imageUri.trim() !== '') {
                    // Check if it's a new image (starts with file://) or existing image
                    if (imageUri.startsWith('file://')) {
                        // New image - add to FormData
                        const filename = imageUri.split('/').pop() || `image${index + 1}.jpg`;
                        const match = /\.(\w+)$/.exec(filename);
                        const type = match ? `image/${match[1]}` : 'image/jpeg';
                        
                        console.log(`Adding new image${index + 1}:`, filename, 'Type:', type);
                        
                        formData.append(`image${index + 1}`, {
                            uri: imageUri,
                            type: type,
                            name: filename
                        } as any);
                        
                        // Mark that this image should replace the existing one
                        formData.append(`replace_image${index + 1}`, 'true');
                    } else if (imageUri.startsWith('/uploads/') || imageUri.startsWith('http')) {
                        // Existing image - keep it but also send the URL
                        console.log(`Keeping existing image${index + 1}:`, imageUri);
                        formData.append(`existing_image${index + 1}`, imageUri);
                    }
                } else {
                    // Empty image - mark for removal
                    console.log(`Removing image${index + 1}`);
                    formData.append(`remove_image${index + 1}`, 'true');
                }
            });
            
            console.log('FormData entries:', Array.from(formData.entries()));
            await onSubmit(formData);
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
                <Text style={styles.imageSectionTitle}>Product Images</Text>
                <Text style={styles.imageSectionSubtitle}>Tap to change, long press to remove</Text>
                <View style={styles.imageGrid}>
                    {selectedImages.map((uri, index) => (
                        <View key={index} style={styles.imageWrapper}>
                            <TouchableOpacity
                                style={styles.imageContainer}
                                onPress={() => handleImagePick(index)}
                                onLongPress={() => uri ? handleImageRemove(index) : null}
                            >
                                {uri ? (
                                    <>
                                        <Image 
                                            source={{ 
                                                uri: uri.startsWith('file://') ? uri : 
                                                uri.startsWith('/uploads/') ? apiService.getFullImageUrl(uri) : uri 
                                            }} 
                                            style={styles.image} 
                                        />
                                        <View style={styles.imageOverlay}>
                                            <Ionicons name="camera" size={20} color="#fff" />
                                        </View>
                                    </>
                                ) : (
                                    <View style={styles.imagePlaceholder}>
                                        <Ionicons name="add" size={24} color="#666" />
                                        <Text style={styles.placeholderText}>Add Image</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            {uri && (
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => handleImageRemove(index)}
                                >
                                    <Ionicons name="close-circle" size={20} color="#ff4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                </View>
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
                            textAlignVertical="top"
                            returnKeyType="next"
                            blurOnSubmit={false}
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
                            textAlignVertical="top"
                            returnKeyType="next"
                            blurOnSubmit={false}
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
                            textAlignVertical="top"
                            returnKeyType="next"
                            blurOnSubmit={false}
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
                            textAlignVertical="top"
                            returnKeyType="next"
                            blurOnSubmit={false}
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
                            textAlignVertical="top"
                            returnKeyType="done"
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
        padding: 16,
    },
    imageSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    imageSectionSubtitle: {
        fontSize: 12,
        color: '#666',
        marginBottom: 12,
    },
    imageGrid: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'space-between',
    },
    imageWrapper: {
        position: 'relative',
        flex: 1,
    },
    imageContainer: {
        width: '100%',
        height: 150,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0,
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderWidth: 2,
        borderColor: '#ddd',
        borderStyle: 'dashed',
    },
    placeholderText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        textAlign: 'center',
    },
    removeButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
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