import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import CategorySelector from './CategorySelector';
import { useCategories } from '../../CategoryContext';

interface NewProductForm {
    name: string;
    description: string;
    price: number;
    category: string;
    stock_quantity: number;
    usage_instructions: string;
    size: string;
    benefits: string;
    ingredients: string;
    product_details: string;
    offer_percentage: number;
}

interface AddProductFormProps {
    onSubmit: () => void;
    newProduct: NewProductForm;
    setNewProduct: React.Dispatch<React.SetStateAction<NewProductForm>>;
    selectedImages: string[];
    setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>;
    handleImagePick: (index: number) => void;
}

const AddProductForm: React.FC<AddProductFormProps> = ({
    onSubmit,
    newProduct,
    setNewProduct,
    selectedImages,
    setSelectedImages,
    handleImagePick,
}) => {
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [activeSection, setActiveSection] = useState('basic');
    const { mainCategories, subCategories, loading, error, fetchCategories } = useCategories();

    const handleCategorySelect = (category: { id: number; name: string }) => {
        setNewProduct((prev: NewProductForm) => ({ ...prev, category: category.name }));
        setShowCategoryModal(false);
    };

    const handlePriceChange = (text: string) => {
        // Remove any non-numeric characters except decimal point
        const numericValue = text.replace(/[^0-9.]/g, '');
        // Ensure only one decimal point
        const parts = numericValue.split('.');
        const formattedValue = parts[0] + (parts.length > 1 ? '.' + parts[1].slice(0, 2) : '');
        setNewProduct((prev: NewProductForm) => ({ ...prev, price: parseFloat(formattedValue) || 0 }));
    };

    const handleStockChange = (text: string) => {
        // Only allow positive integers
        const numericValue = text.replace(/[^0-9]/g, '');
        setNewProduct((prev: NewProductForm) => ({ ...prev, stock_quantity: parseInt(numericValue) || 0 }));
    };

    const handleOfferChange = (text: string) => {
        // Only allow numbers between 0 and 100
        const numericValue = text.replace(/[^0-9]/g, '');
        const percentage = parseInt(numericValue) || 0;
        const validPercentage = Math.min(Math.max(percentage, 0), 100);
        setNewProduct((prev: NewProductForm) => ({ ...prev, offer_percentage: validPercentage }));
    };

    const handleSizeChange = (text: string) => {
        // Convert to uppercase and remove extra spaces
        const formattedSize = text.toUpperCase().trim().replace(/\s+/g, ' ');
        setNewProduct((prev: NewProductForm) => ({ ...prev, size: formattedSize }));
    };

    const getSectionCompletion = (section: string) => {
        switch (section) {
            case 'basic':
                return newProduct.name.trim() && newProduct.category && newProduct.price > 0;
            case 'details':
                return true; // Optional section
            case 'images':
                return selectedImages.some(img => img);
            case 'inventory':
                return newProduct.stock_quantity > 0;
            default:
                return false;
        }
    };

    const renderSectionButton = (section: string, label: string, icon: string) => {
        const isCompleted = getSectionCompletion(section);
        const isActive = activeSection === section;
        
        return (
            <TouchableOpacity
                style={[
                    styles.sectionButton,
                    isActive && styles.activeSectionButton,
                    isCompleted && !isActive && styles.completedSectionButton
                ]}
                onPress={() => setActiveSection(section)}
            >
                <View style={styles.sectionButtonContent}>
                    <Ionicons 
                        name={isCompleted ? 'checkmark-circle' : icon as any} 
                        size={20} 
                        color={
                            isActive ? '#fff' : 
                            isCompleted ? '#28a745' : '#666'
                        } 
                    />
                    <Text style={[
                        styles.sectionButtonText,
                        isActive && styles.activeSectionButtonText,
                        isCompleted && !isActive && styles.completedSectionButtonText
                    ]}>
                        {label}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Fixed Header */}
            <View style={styles.header}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.sectionNavContent}
                >
                    {renderSectionButton('basic', 'Basic Info', 'information-circle')}
                    {renderSectionButton('details', 'Details', 'list')}
                    {renderSectionButton('images', 'Images', 'images')}
                    {renderSectionButton('inventory', 'Inventory', 'cube')}
                </ScrollView>
                <View style={styles.headerHint}>
                    <Ionicons name="arrow-down" size={16} color="#FF69B4" />
                    <Text style={styles.headerHintText}>Scroll down to see the Add Product button</Text>
                </View>
            </View>

            {/* Scrollable Content */}
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.contentContainer}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
            >
                <ScrollView
                    style={styles.scrollContent}
                    contentContainerStyle={styles.scrollContentContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                    alwaysBounceVertical={false}
                >
                    {/* Form Sections */}
                    {activeSection === 'basic' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Basic Information</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Product Name *</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        !newProduct.name.trim() && styles.inputError
                                    ]}
                                    placeholder="Enter product name"
                                    placeholderTextColor="#999"
                                    value={newProduct.name}
                                    onChangeText={(text) => setNewProduct((prev: NewProductForm) => ({ ...prev, name: text }))}
                                />
                                {!newProduct.name.trim() && (
                                    <Text style={styles.errorText}>Product name is required</Text>
                                )}
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Description</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Enter product description"
                                    placeholderTextColor="#999"
                                    value={newProduct.description}
                                    onChangeText={(text) => setNewProduct((prev: NewProductForm) => ({ ...prev, description: text }))}
                                    multiline
                                    textAlignVertical="top"
                                    returnKeyType="next"
                                    blurOnSubmit={false}
                                />
                                <Text style={styles.helperText}>Optional: Describe your product in detail</Text>
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Price (₹) *</Text>
                                <View style={[
                                    styles.priceInputContainer,
                                    (!newProduct.price || newProduct.price <= 0) && styles.inputError
                                ]}>
                                    <Text style={styles.rupeeSymbol}>₹</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        value={String(newProduct.price)}
                                        onChangeText={handlePriceChange}
                                        placeholder="0.00"
                                        placeholderTextColor="#999"
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                                {(!newProduct.price || newProduct.price <= 0) && (
                                    <Text style={styles.errorText}>Please enter a valid price</Text>
                                )}
                                <Text style={styles.helperText}>Enter price in Indian Rupees (₹)</Text>
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Stock Quantity *</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        (!newProduct.stock_quantity || newProduct.stock_quantity < 0) && styles.inputError
                                    ]}
                                    value={String(newProduct.stock_quantity)}
                                    onChangeText={handleStockChange}
                                    placeholder="Enter available stock"
                                    placeholderTextColor="#999"
                                    keyboardType="number-pad"
                                />
                                {(!newProduct.stock_quantity || newProduct.stock_quantity < 0) && (
                                    <Text style={styles.errorText}>Please enter a valid stock quantity</Text>
                                )}
                                <Text style={styles.helperText}>Enter number of units available</Text>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Offer Percentage</Text>
                                <TextInput
                                    style={styles.input}
                                    value={String(newProduct.offer_percentage || 0)}
                                    onChangeText={handleOfferChange}
                                    placeholder="Enter offer percentage (0-100)"
                                    placeholderTextColor="#999"
                                    keyboardType="number-pad"
                                />
                                <Text style={styles.helperText}>Enter discount percentage (0 means no offer)</Text>
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Category *</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.input, 
                                        styles.categorySelector,
                                        !newProduct.category && styles.inputError
                                    ]}
                                    onPress={() => setShowCategoryModal(true)}
                                >
                                    <Text style={newProduct.category ? styles.categoryText : styles.placeholderText}>
                                        {newProduct.category || 'Select Category'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color="#666" />
                                </TouchableOpacity>
                                {!newProduct.category && (
                                    <Text style={styles.errorText}>Please select a category</Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Product Details Section */}
                    {activeSection === 'details' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Product Details</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Usage Instructions"
                                value={newProduct.usage_instructions}
                                onChangeText={(text) => setNewProduct((prev: NewProductForm) => ({ ...prev, usage_instructions: text }))}
                                multiline
                                textAlignVertical="top"
                                returnKeyType="next"
                                blurOnSubmit={false}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Size"
                                value={newProduct.size}
                                onChangeText={handleSizeChange}
                                returnKeyType="next"
                            />
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Benefits"
                                value={newProduct.benefits}
                                onChangeText={(text) => setNewProduct((prev: NewProductForm) => ({ ...prev, benefits: text }))}
                                multiline
                                textAlignVertical="top"
                                returnKeyType="next"
                                blurOnSubmit={false}
                            />
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Ingredients"
                                value={newProduct.ingredients}
                                onChangeText={(text) => setNewProduct((prev: NewProductForm) => ({ ...prev, ingredients: text }))}
                                multiline
                                textAlignVertical="top"
                                returnKeyType="next"
                                blurOnSubmit={false}
                            />
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Additional Product Details"
                                value={newProduct.product_details}
                                onChangeText={(text) => setNewProduct((prev: NewProductForm) => ({ ...prev, product_details: text }))}
                                multiline
                                textAlignVertical="top"
                                returnKeyType="done"
                            />
                        </View>
                    )}

                    {/* Images Section */}
                    {activeSection === 'images' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Product Images</Text>
                            <Text style={styles.imageUploadTitle}>Upload up to 3 images for your product</Text>
                            <Text style={styles.imageUploadSubtitle}>Tap on any slot to add an image</Text>
                            <View style={styles.imageUploadGrid}>
                                {[0, 1, 2].map((index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.imageUploadButton,
                                            selectedImages[index] && styles.imageUploadButtonFilled
                                        ]}
                                        onPress={() => handleImagePick(index)}
                                    >
                                        {selectedImages[index] ? (
                                            <View style={styles.uploadedImageContainer}>
                                                <Image
                                                    source={{ uri: selectedImages[index] }}
                                                    style={styles.uploadedImage}
                                                />
                                                <TouchableOpacity
                                                    style={styles.removeImageButton}
                                                    onPress={() => {
                                                        const newImages = [...selectedImages];
                                                        newImages[index] = '';
                                                        setSelectedImages(newImages);
                                                    }}
                                                >
                                                    <Ionicons name="close-circle" size={20} color="#dc3545" />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <View style={styles.uploadPlaceholder}>
                                                <Ionicons name="camera" size={32} color="#666" />
                                                <Text style={styles.uploadText}>Tap to Upload</Text>
                                                <Text style={styles.uploadSubtext}>Image {index + 1}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.imageHelperText}>
                                💡 Tip: Use high-quality images with good lighting for better product presentation
                            </Text>
                        </View>
                    )}

                    {/* Inventory Section */}
                    {activeSection === 'inventory' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Inventory Management</Text>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Stock Quantity *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={String(newProduct.stock_quantity)}
                                    onChangeText={handleStockChange}
                                    placeholder="Enter available stock"
                                    placeholderTextColor="#999"
                                    keyboardType="number-pad"
                                />
                            </View>
                            <Text style={styles.helperText}>Enter number of units available</Text>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Offer Percentage</Text>
                                <TextInput
                                    style={styles.input}
                                    value={String(newProduct.offer_percentage || 0)}
                                    onChangeText={handleOfferChange}
                                    placeholder="Enter offer percentage (0-100)"
                                    placeholderTextColor="#999"
                                    keyboardType="number-pad"
                                />
                            </View>
                            <Text style={styles.helperText}>Enter discount percentage (0 means no offer)</Text>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Fixed Footer */}
            <View style={styles.footer}>
                <View style={styles.footerContent}>
                    <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={() => {
                            // Reset form and go back
                            setNewProduct({
                                name: '',
                                description: '',
                                price: 0,
                                category: '',
                                stock_quantity: 0,
                                usage_instructions: '',
                                size: '',
                                benefits: '',
                                ingredients: '',
                                product_details: '',
                                offer_percentage: 0
                            });
                            setSelectedImages([]);
                            setActiveSection('basic');
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close-circle" size={20} color="#666" />
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.submitButton}
                        onPress={onSubmit}
                        activeOpacity={0.8}
                    >
                        <View style={styles.submitButtonContent}>
                            <Ionicons name="add-circle" size={22} color="#fff" />
                            <Text style={styles.submitButtonText}>Add Product</Text>
                        </View>
                        <View style={styles.submitButtonGlow} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Floating Action Button */}
            <TouchableOpacity 
                style={styles.floatingActionButton}
                onPress={onSubmit}
                activeOpacity={0.8}
            >
                <Ionicons name="add-circle" size={28} color="#fff" />
            </TouchableOpacity>

            <CategorySelector
                visible={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                onSelect={handleCategorySelect}
                selectedCategory={newProduct.category}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    sectionNavContent: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#fff5f5',
        borderTopWidth: 1,
        borderTopColor: '#ffe0e6',
    },
    headerHintText: {
        marginLeft: 6,
        fontSize: 12,
        color: '#FF69B4',
        fontWeight: '500',
    },
    contentContainer: {
        flex: 1,
    },
    scrollContent: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: 120, // Increased padding to ensure content is not hidden behind keyboard or footer
    },
    section: {
        padding: 16,
    },
    sectionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    activeSectionButton: {
        backgroundColor: '#FF69B4',
        borderColor: '#FF69B4',
    },
    completedSectionButton: {
        backgroundColor: '#f8fff9',
        borderColor: '#28a745',
    },
    sectionButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionButtonText: {
        marginLeft: 8,
        color: '#666',
        fontWeight: '500',
        fontSize: 14,
    },
    activeSectionButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    completedSectionButtonText: {
        color: '#28a745',
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    input: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e9ecef',
        minHeight: 48,
    },
    textArea: {
        minHeight: 100,
        maxHeight: 200,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    categorySelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryText: {
        fontSize: 16,
        color: '#000',
    },
    placeholderText: {
        fontSize: 16,
        color: '#999',
    },
    imageUploadTitle: {
        fontSize: 18,
        color: '#333',
        marginBottom: 8,
        fontWeight: '600',
    },
    imageUploadSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    imageUploadGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    imageUploadButton: {
        width: 110,
        height: 110,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e9ecef',
        borderStyle: 'dashed',
    },
    imageUploadButtonFilled: {
        borderColor: '#28a745',
        borderStyle: 'solid',
    },
    uploadedImageContainer: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
        position: 'relative',
    },
    uploadedImage: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    removeImageButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 2,
    },
    uploadPlaceholder: {
        alignItems: 'center',
        padding: 8,
    },
    uploadText: {
        marginTop: 6,
        color: '#666',
        fontSize: 12,
        fontWeight: '500',
    },
    uploadSubtext: {
        marginTop: 2,
        color: '#999',
        fontSize: 10,
    },
    imageHelperText: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#FF69B4',
    },
    footer: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
        zIndex: 1000,
    },
    footerContent: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
        gap: 6,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    submitButton: {
        flex: 2,
        backgroundColor: '#FF69B4',
        borderRadius: 12,
        elevation: 6,
        shadowColor: '#FF69B4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        minHeight: 50,
    },
    submitButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 8,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    submitButtonGlow: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        backgroundColor: 'rgba(255, 105, 180, 0.3)',
        borderRadius: 14,
        zIndex: -1,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    priceInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    rupeeSymbol: {
        fontSize: 16,
        color: '#333',
        paddingLeft: 12,
        paddingRight: 4,
    },
    priceInput: {
        flex: 1,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    helperText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        fontStyle: 'italic',
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputError: {
        borderColor: '#dc3545',
        backgroundColor: '#fff5f5',
    },
    errorText: {
        fontSize: 12,
        color: '#dc3545',
        marginTop: 4,
        fontWeight: '500',
    },
    floatingActionButton: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FF69B4',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#FF69B4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        zIndex: 1001,
    },
});

export default AddProductForm; 