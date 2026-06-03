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
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import CategorySelector from './CategorySelector';
import { useCategories } from '../../CategoryContext';

interface NewProductForm {
    name: string;
    description: string;
    price: number;
    category: string; // Primary category name for display/compatibility
    category_id?: number; // Primary category ID
    selectedCategories: { id: number; name: string }[]; // New: Multiple categories
    stock_quantity: number;
    usage_instructions: string;
    size: string;
    benefits: string;
    ingredients: string;
    product_details: string;
    offer_percentage: number;
}

export interface MediaAsset {
    uri: string;
    name: string;
    type: string;
}

export const normalizeFileType = (uri: string, type?: string): 'image' | 'gif' | 'video' | 'document' => {
    const typeStr = (type || '').toLowerCase();
    const ext = (uri || '').split('.').pop()?.toLowerCase() || '';

    if (typeStr.includes('gif') || ext === 'gif') return 'gif';
    if (typeStr.includes('video') || ['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'video';
    if (typeStr.includes('image') || ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext)) return 'image';
    if (typeStr.includes('pdf') || typeStr.includes('word') || typeStr.includes('excel') || typeStr.includes('sheet') || typeStr.includes('text') || ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'].includes(ext)) return 'document';
    
    return 'image';
};

interface AddProductFormProps {
    onSubmit: () => void;
    newProduct: NewProductForm;
    setNewProduct: React.Dispatch<React.SetStateAction<NewProductForm>>;
    selectedImages: MediaAsset[];
    setSelectedImages: React.Dispatch<React.SetStateAction<MediaAsset[]>>;
    handleImagePick?: (index: number) => void;
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

    const getFileType = (uri: string) => {
        if (!uri) return 'image';
        const ext = uri.split('.').pop()?.toLowerCase();
        if (ext === 'gif') return 'gif';
        if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return 'video';
        if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'].includes(ext || '')) return 'document';
        return 'image';
    };

    const handleRemoveMedia = (index: number) => {
        const newImages = selectedImages.filter((_, i) => i !== index);
        setSelectedImages(newImages);
    };

    const handleMoveMediaLeft = (index: number) => {
        if (index === 0) return;
        const newImages = [...selectedImages];
        const temp = newImages[index];
        newImages[index] = newImages[index - 1];
        newImages[index - 1] = temp;
        setSelectedImages(newImages);
    };

    const handleMoveMediaRight = (index: number) => {
        if (index === selectedImages.length - 1) return;
        const newImages = [...selectedImages];
        const temp = newImages[index];
        newImages[index] = newImages[index + 1];
        newImages[index + 1] = temp;
        setSelectedImages(newImages);
    };

    const pickImage = async (isVideo: boolean) => {
        try {
            const currentCount = selectedImages.length;
            const remainingSlots = 4 - currentCount;
            
            if (remainingSlots <= 0) {
                Alert.alert('Limit Reached', 'Maximum 4 media files are allowed per product.');
                return;
            }

            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Permission Required', 'Please allow access to your photo library');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: isVideo ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                selectionLimit: remainingSlots,
                quality: 0.7,
                exif: false,
                base64: false,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                let assetsToAdd = result.assets;
                if (assetsToAdd.length > remainingSlots) {
                    Alert.alert(
                        'Limit Exceeded',
                        `Only the first ${remainingSlots} items were added to stay within the 4-file limit.`
                    );
                    assetsToAdd = assetsToAdd.slice(0, remainingSlots);
                }

                const mapped = assetsToAdd.map((asset, i) => {
                    const uri = asset.uri;
                    const filename = asset.fileName || uri.split('/').pop() || `media_${Date.now()}_${i}.${isVideo ? 'mp4' : 'jpg'}`;
                    
                    let type = asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');
                    if (filename.toLowerCase().endsWith('.gif')) {
                        type = 'image/gif';
                    }
                    return { uri, name: filename, type };
                });

                setSelectedImages(prev => [
                    ...prev.filter(x => x && x.uri),
                    ...mapped
                ]);
            }
        } catch (err) {
            console.error('Error picking image/video:', err);
            Alert.alert('Error', 'Failed to pick image/video');
        }
    };

    const pickFromFiles = async () => {
        try {
            const currentCount = selectedImages.length;
            const remainingSlots = 4 - currentCount;
            
            if (remainingSlots <= 0) {
                Alert.alert('Limit Reached', 'Maximum 4 media files are allowed per product.');
                return;
            }

            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    'image/*',
                    'video/*',
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'text/plain',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ],
                copyToCacheDirectory: true,
                multiple: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                let assetsToAdd = result.assets;
                if (assetsToAdd.length > remainingSlots) {
                    Alert.alert(
                        'Limit Exceeded',
                        `Only the first ${remainingSlots} items were added to stay within the 4-file limit.`
                    );
                    assetsToAdd = assetsToAdd.slice(0, remainingSlots);
                }

                const mapped = assetsToAdd.map((asset) => {
                    const uri = asset.uri;
                    const filename = asset.name || uri.split('/').pop() || `file_${Date.now()}`;
                    const type = asset.mimeType || 'application/octet-stream';
                    return { uri, name: filename, type };
                });

                setSelectedImages(prev => [
                    ...prev.filter(x => x && x.uri),
                    ...mapped
                ]);
            }
        } catch (err) {
            console.error('Error picking file:', err);
            Alert.alert('Error', 'Failed to browse files');
        }
    };

    const handleUploadMedia = () => {
        if (selectedImages.length >= 4) {
            Alert.alert('Limit Reached', 'Maximum 4 media files are allowed per product.');
            return;
        }

        Alert.alert(
            'Upload Media',
            'Select the source of your media file (Max 4 total):',
            [
                { text: 'Image', onPress: () => pickImage(false) },
                { text: 'Video', onPress: () => pickImage(true) },
                { text: 'Files', onPress: () => pickFromFiles() },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const handleCategorySelect = (categories: { id: number; name: string }[]) => {
        if (categories.length > 0) {
            setNewProduct((prev: NewProductForm) => ({
                ...prev,
                category: categories[0].name, // Keep existing field for primary
                category_id: categories[0].id,
                selectedCategories: categories
            }));
        } else {
            setNewProduct((prev: NewProductForm) => ({
                ...prev,
                category: '',
                category_id: undefined,
                selectedCategories: []
            }));
        }
        setShowCategoryModal(false);
    };

    const removeCategory = (catId: number) => {
        setNewProduct((prev: NewProductForm) => {
            const newStats = prev.selectedCategories.filter(c => c.id !== catId);
            return {
                ...prev,
                selectedCategories: newStats,
                category: newStats.length > 0 ? newStats[0].name : '',
                category_id: newStats.length > 0 ? newStats[0].id : undefined
            };
        });
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
                return newProduct.name.trim() && newProduct.selectedCategories.length > 0 && newProduct.price > 0;
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
                                <Text style={styles.label}>Categories *</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.input,
                                        styles.categorySelector,
                                        newProduct.selectedCategories.length === 0 && styles.inputError
                                    ]}
                                    onPress={() => setShowCategoryModal(true)}
                                >
                                    <Text style={newProduct.selectedCategories.length > 0 ? styles.categoryText : styles.placeholderText}>
                                        {newProduct.selectedCategories.length > 0
                                            ? `${newProduct.selectedCategories.length} Selected`
                                            : 'Select Categories'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color="#666" />
                                </TouchableOpacity>

                                {/* Selected Categories Chips */}
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                                    {newProduct.selectedCategories.map((cat) => (
                                        <View key={cat.id} style={{
                                            backgroundColor: '#e3f2fd',
                                            paddingHorizontal: 10,
                                            paddingVertical: 4,
                                            borderRadius: 16,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            borderWidth: 1,
                                            borderColor: '#90caf9'
                                        }}>
                                            <Text style={{ color: '#1976d2', marginRight: 6, fontSize: 12 }}>{cat.name}</Text>
                                            <TouchableOpacity onPress={() => removeCategory(cat.id)}>
                                                <Ionicons name="close-circle" size={16} color="#1976d2" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>

                                {newProduct.selectedCategories.length === 0 && (
                                    <Text style={styles.errorText}>Please select at least one category</Text>
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
                            <Text style={styles.sectionTitle}>Product Media & Files</Text>
                            <Text style={styles.imageUploadTitle}>Dynamic Media Upload (Images, GIFs, Videos, Documents)</Text>
                            <Text style={styles.imageUploadSubtitle}>Manage up to 4 media items to display on the user product detail carousel</Text>
                            
                            <View style={styles.mediaGrid}>
                                {selectedImages.filter(item => item && item.uri).map((item, index) => {
                                    const uri = item.uri;
                                    const filename = item.name || `File ${index + 1}`;
                                    const fileType = normalizeFileType(uri, item.type);
                                    
                                    return (
                                        <View key={index} style={styles.mediaCard}>
                                            {fileType === 'image' || fileType === 'gif' ? (
                                                <Image source={{ uri }} style={styles.uploadedImage} />
                                            ) : fileType === 'video' ? (
                                                <View style={styles.mediaPlaceholderContainer}>
                                                    <Ionicons name="play-circle" size={40} color="#FF69B4" />
                                                    <Text style={styles.mediaPlaceholderText} numberOfLines={1}>Video</Text>
                                                </View>
                                            ) : (
                                                <View style={styles.mediaPlaceholderContainer}>
                                                    <Ionicons name="document-text" size={40} color="#2196F3" />
                                                    <Text style={styles.mediaPlaceholderText} numberOfLines={1}>{filename}</Text>
                                                </View>
                                            )}
                                            
                                            <View style={styles.orderBadge}>
                                                <Text style={styles.orderBadgeText}>{index + 1}</Text>
                                            </View>

                                            <View style={styles.mediaTypeBadge}>
                                                <Text style={styles.mediaTypeBadgeText}>{fileType.toUpperCase()}</Text>
                                            </View>
                                            
                                            <View style={styles.cardReorderBar}>
                                                <TouchableOpacity
                                                    onPress={() => handleMoveMediaLeft(index)}
                                                    disabled={index === 0}
                                                    style={[styles.reorderBarBtn, index === 0 && styles.reorderBarBtnDisabled]}
                                                >
                                                    <Ionicons name="chevron-back" size={16} color={index === 0 ? "#888" : "#fff"} />
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => handleRemoveMedia(index)}
                                                    style={styles.reorderBarBtn}
                                                >
                                                    <Ionicons name="trash" size={14} color="#ff4d4d" />
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => handleMoveMediaRight(index)}
                                                    disabled={index === selectedImages.length - 1}
                                                    style={[styles.reorderBarBtn, index === selectedImages.length - 1 && styles.reorderBarBtnDisabled]}
                                                >
                                                    <Ionicons name="chevron-forward" size={16} color={index === selectedImages.length - 1 ? "#888" : "#fff"} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}

                                {selectedImages.filter(item => item && item.uri).length === 0 && (
                                    <View style={styles.noMediaContainer}>
                                        <Ionicons name="cloud-upload" size={48} color="#ccc" />
                                        <Text style={styles.noMediaText}>No media added yet</Text>
                                        <Text style={styles.noMediaSubtext}>Use the button below to upload images, gifs, videos, and documents.</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.addButtonRow}>
                                <TouchableOpacity 
                                    style={[styles.mediaActionButton, { backgroundColor: '#FF69B4', minWidth: 200, paddingVertical: 12 }]} 
                                    onPress={handleUploadMedia}
                                >
                                    <Ionicons name="cloud-upload" size={22} color="#fff" />
                                    <Text style={[styles.mediaActionButtonText, { fontSize: 14 }]}>Upload Media (Max 4)</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.imageHelperText}>
                                💡 Tip: Standard images and static GIFs are center-squared and optimized to 2400x2400 on the backend. Videos and documents will keep their formats intact. Maximum 4 media items are allowed in total.
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
                                category_id: undefined,
                                selectedCategories: [],
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
                onSelectMultiple={handleCategorySelect}
                selectedCategories={newProduct.selectedCategories.map(c => c.name)}
                multiSelect={true}
                onSelect={() => { }} // No-op for single select
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
    mediaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
        justifyContent: 'flex-start',
    },
    mediaCard: {
        width: 105,
        height: 105,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
        position: 'relative',
        overflow: 'hidden',
    },
    mediaPlaceholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
    },
    mediaPlaceholderText: {
        fontSize: 10,
        color: '#666',
        marginTop: 4,
        textAlign: 'center',
        fontWeight: '500',
    },
    mediaTypeBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    mediaTypeBadgeText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: 'bold',
    },
    noMediaContainer: {
        width: '100%',
        padding: 30,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e9ecef',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
    },
    noMediaText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginTop: 10,
    },
    noMediaSubtext: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
        textAlign: 'center',
    },
    addButtonRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
        flexWrap: 'wrap',
    },
    mediaActionButton: {
        flex: 1,
        minWidth: 100,
        backgroundColor: '#FF69B4',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    mediaActionButtonText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    orderBadge: {
        position: 'absolute',
        top: 6,
        left: 6,
        backgroundColor: '#FF69B4',
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        zIndex: 100,
    },
    orderBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    cardReorderBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 28,
        backgroundColor: 'rgba(0,0,0,0.7)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderBottomLeftRadius: 11,
        borderBottomRightRadius: 11,
        zIndex: 10,
    },
    reorderBarBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reorderBarBtnDisabled: {
        opacity: 0.3,
    },
});

export default AddProductForm; 