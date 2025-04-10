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

    const renderSectionButton = (section: string, label: string, icon: string) => (
        <TouchableOpacity
            style={[
                styles.sectionButton,
                activeSection === section && styles.activeSectionButton
            ]}
            onPress={() => setActiveSection(section)}
        >
            <Ionicons 
                name={icon as any} 
                size={20} 
                color={activeSection === section ? '#fff' : '#666'} 
            />
            <Text style={[
                styles.sectionButtonText,
                activeSection === section && styles.activeSectionButtonText
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

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
            </View>

            {/* Scrollable Content */}
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.contentContainer}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView
                    style={styles.scrollContent}
                    contentContainerStyle={styles.scrollContentContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Form Sections */}
                    {activeSection === 'basic' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Basic Information</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Product Name"
                                value={newProduct.name}
                                onChangeText={(text) => setNewProduct((prev: NewProductForm) => ({ ...prev, name: text }))}
                            />
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Description"
                                value={newProduct.description}
                                onChangeText={(text) => setNewProduct((prev: NewProductForm) => ({ ...prev, description: text }))}
                                multiline
                            />
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Price (₹) *</Text>
                                <View style={styles.priceInputContainer}>
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
                                <Text style={styles.helperText}>Enter price in Indian Rupees (₹)</Text>
                            </View>
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
                            <TouchableOpacity
                                style={[styles.input, styles.categorySelector]}
                                onPress={() => setShowCategoryModal(true)}
                            >
                                <Text style={newProduct.category ? styles.categoryText : styles.placeholderText}>
                                    {newProduct.category || 'Select Category'}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color="#666" />
                            </TouchableOpacity>
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
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Size"
                                value={newProduct.size}
                                onChangeText={handleSizeChange}
                            />
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Benefits"
                                value={newProduct.benefits}
                                onChangeText={(text) => setNewProduct((prev: NewProductForm) => ({ ...prev, benefits: text }))}
                                multiline
                            />
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Ingredients"
                                value={newProduct.ingredients}
                                onChangeText={(text) => setNewProduct((prev: NewProductForm) => ({ ...prev, ingredients: text }))}
                                multiline
                            />
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Additional Product Details"
                                value={newProduct.product_details}
                                onChangeText={(text) => setNewProduct((prev: NewProductForm) => ({ ...prev, product_details: text }))}
                                multiline
                            />
                        </View>
                    )}

                    {/* Images Section */}
                    {activeSection === 'images' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Product Images</Text>
                            <Text style={styles.imageUploadTitle}>Upload up to 3 images</Text>
                            <View style={styles.imageUploadGrid}>
                                {[0, 1, 2].map((index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.imageUploadButton}
                                        onPress={() => handleImagePick(index)}
                                    >
                                        {selectedImages[index] ? (
                                            <Image
                                                source={{ uri: selectedImages[index] }}
                                                style={styles.uploadedImage}
                                            />
                                        ) : (
                                            <View style={styles.uploadPlaceholder}>
                                                <Ionicons name="camera" size={32} color="#666" />
                                                <Text style={styles.uploadText}>Upload</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
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
                <TouchableOpacity 
                    style={styles.submitButton}
                    onPress={onSubmit}
                >
                    <Text style={styles.submitButtonText}>Add Product</Text>
                </TouchableOpacity>
            </View>

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
    contentContainer: {
        flex: 1,
    },
    scrollContent: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: 20,
    },
    section: {
        padding: 16,
    },
    sectionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#f8f9fa',
    },
    activeSectionButton: {
        backgroundColor: '#FF69B4',
    },
    sectionButtonText: {
        marginLeft: 8,
        color: '#666',
        fontWeight: '500',
    },
    activeSectionButtonText: {
        color: '#fff',
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
        height: 100,
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
        fontSize: 16,
        color: '#666',
        marginBottom: 12,
    },
    imageUploadGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    imageUploadButton: {
        width: 100,
        height: 100,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    uploadedImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    uploadPlaceholder: {
        alignItems: 'center',
    },
    uploadText: {
        marginTop: 8,
        color: '#666',
        fontSize: 12,
    },
    footer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    submitButton: {
        backgroundColor: '#FF69B4',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
});

export default AddProductForm; 