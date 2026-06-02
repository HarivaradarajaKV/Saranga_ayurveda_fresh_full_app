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
import * as DocumentPicker from 'expo-document-picker';
import CategorySelector from './CategorySelector';
import { apiService } from '../../services/api';
import { MediaAsset, normalizeFileType } from './AddProductForm';

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    category_id?: number; // Added category_id
    categories?: { id: number; name: string }[]; // New: Multiple categories
    image_url: string;
    image_url2?: string;
    image_url3?: string;
    image_url4?: string;
    media?: Array<{ url: string; type: 'image' | 'gif' | 'video' | 'document' }>;
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
        category_id: product.category_id, // Initialize category_id
        categories: product.categories || [], // Initialize categories
        stock_quantity: product.stock_quantity,
        usage_instructions: product.usage_instructions,
        size: product.size,
        benefits: product.benefits,
        ingredients: product.ingredients,
        product_details: product.product_details,
        offer_percentage: product.offer_percentage,
    });
    interface MergedMedia {
        url?: string;
        uri?: string;
        name?: string;
        type: string;
        isNew?: boolean;
    }
    const [mediaItems, setMediaItems] = useState<MergedMedia[]>([]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [activeSection, setActiveSection] = useState('basic');

    // Update mediaItems when product changes
    useEffect(() => {
        let list: MergedMedia[] = [];
        if (product.media && Array.isArray(product.media)) {
            list = product.media.map(m => ({ url: m.url, type: m.type }));
        } else {
            const legacy: MergedMedia[] = [];
            if (product.image_url) legacy.push({ url: product.image_url, type: 'image' });
            if (product.image_url2) legacy.push({ url: product.image_url2, type: 'image' });
            if (product.image_url3) legacy.push({ url: product.image_url3, type: 'image' });
            if (product.image_url4) legacy.push({ url: product.image_url4, type: 'image' });
            list = legacy;
        }
        setMediaItems(list);
        setEditedProduct(prev => ({
            ...prev,
            category_id: product.category_id, // Ensure ID syncs
            categories: product.categories || []
        }));
    }, [product]);

    const getFileType = (uri: string) => {
        if (!uri) return 'image';
        const ext = uri.split('.').pop()?.toLowerCase();
        if (ext === 'gif') return 'gif';
        if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return 'video';
        if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'].includes(ext || '')) return 'document';
        return 'image';
    };

    const handleMoveMediaLeft = (index: number) => {
        if (index === 0) return;
        setMediaItems(prev => {
            const list = [...prev];
            const temp = list[index];
            list[index] = list[index - 1];
            list[index - 1] = temp;
            return list;
        });
    };

    const handleMoveMediaRight = (index: number) => {
        if (index === mediaItems.length - 1) return;
        setMediaItems(prev => {
            const list = [...prev];
            const temp = list[index];
            list[index] = list[index + 1];
            list[index + 1] = temp;
            return list;
        });
    };

    const handleRemoveMedia = (index: number) => {
        const item = mediaItems[index];
        if (!item.isNew) {
            Alert.alert(
                'Remove Active Media',
                'Are you sure you want to remove this active media item?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => setMediaItems(prev => prev.filter((_, i) => i !== index)) }
                ]
            );
        } else {
            setMediaItems(prev => prev.filter((_, i) => i !== index));
        }
    };

    const pickImage = async (isVideo: boolean) => {
        try {
            const currentCount = mediaItems.length;
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
                    return { uri, name: filename, type, isNew: true };
                });

                setMediaItems(prev => [
                    ...prev,
                    ...mapped
                ]);
            }
        } catch (error) {
            console.error('Error picking image/video:', error);
            Alert.alert('Error', 'Failed to pick image/video');
        }
    };

    const pickFromFiles = async () => {
        try {
            const currentCount = mediaItems.length;
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
                    return { uri, name: filename, type, isNew: true };
                });

                setMediaItems(prev => [
                    ...prev,
                    ...mapped
                ]);
            }
        } catch (err) {
            console.error('Error browsing files:', err);
            Alert.alert('Error', 'Failed to browse files');
        }
    };

    const handleUploadMedia = () => {
        if (mediaItems.length >= 4) {
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
            setEditedProduct(prev => ({
                ...prev,
                category: categories[0].name,
                category_id: categories[0].id,
                categories: categories
            }));
        } else {
            setEditedProduct(prev => ({
                ...prev,
                category: '',
                category_id: undefined,
                categories: []
            }));
        }
        setShowCategoryModal(false);
    };

    const removeCategory = (catId: number) => {
        setEditedProduct(prev => {
            const currentCats = prev.categories || [];
            const newStats = currentCats.filter(c => c.id !== catId);
            return {
                ...prev,
                categories: newStats,
                category: newStats.length > 0 ? newStats[0].name : '',
                category_id: newStats.length > 0 ? newStats[0].id : undefined
            };
        });
    };

    const handleSubmit = async () => {
        try {
            // Create FormData for image uploads
            const formData = new FormData();

            // Add basic product data
            formData.append('name', editedProduct.name || '');
            formData.append('description', editedProduct.description || '');
            formData.append('price', String(editedProduct.price || 0));
            if (editedProduct.category_id) {
                formData.append('category_id', String(editedProduct.category_id));
            }
            // Add categories
            if (editedProduct.categories && editedProduct.categories.length > 0) {
                formData.append('category_ids', JSON.stringify(editedProduct.categories.map(c => c.id)));
                // Also ensure primary category is set to the first one
                formData.append('category', editedProduct.categories[0].name);
                formData.append('category_id', String(editedProduct.categories[0].id));
            }

            formData.append('stock_quantity', String(editedProduct.stock_quantity || 0));
            formData.append('offer_percentage', String(editedProduct.offer_percentage || 0));
            formData.append('usage_instructions', editedProduct.usage_instructions || '');
            formData.append('size', editedProduct.size || '');
            formData.append('benefits', editedProduct.benefits || '');
            formData.append('ingredients', editedProduct.ingredients || '');
            formData.append('product_details', editedProduct.product_details || '');

            let useDirectUpload = false;
            let updatedMediaItems: Array<{ url: string; type: string }> = [];

            try {
                console.log('[Direct Upload] Attempting secure signed URL direct uploads...');
                
                updatedMediaItems = await Promise.all(
                    mediaItems.map(async (item) => {
                        if (item.isNew && item.uri) {
                            console.log(`[Direct Upload] Requesting signed upload URL for: ${item.name}`);
                            const signedRes = await apiService.post<{ signedUrl: string; publicUrl: string; path: string }>('/products/signed-upload-url', {
                                fileName: item.name || 'image.jpg'
                            });

                            if (!signedRes.data || !signedRes.data.signedUrl || !signedRes.data.publicUrl) {
                                throw new Error(signedRes.error || 'Failed to get signed URL');
                            }

                            console.log(`[Direct Upload] Uploading to signed URL: ${signedRes.data.signedUrl}`);
                            const localFile = await fetch(item.uri);
                            const blob = await localFile.blob();

                            const uploadResponse = await fetch(signedRes.data.signedUrl, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': item.type || 'image/jpeg',
                                },
                                body: blob
                            });

                            if (!uploadResponse.ok) {
                                const errorText = await uploadResponse.text();
                                throw new Error(`Signed upload failed: ${errorText}`);
                            }

                            console.log(`[Direct Upload] Successfully uploaded directly to Supabase: ${signedRes.data.publicUrl}`);
                            return { url: signedRes.data.publicUrl, type: item.type };
                        } else {
                            return { url: item.url || '', type: item.type };
                        }
                    })
                );
                
                useDirectUpload = true;
                formData.append('existing_media', JSON.stringify(updatedMediaItems));
                console.log('Sending direct stitched media order:', JSON.stringify(updatedMediaItems));
            } catch (err) {
                console.warn('[Direct Upload] Failed or not supported, falling back to backend multi-part upload:', err);
                useDirectUpload = false;
            }

            if (!useDirectUpload) {
                // Fallback: Retain original upload method
                let uploadIndex = 0;
                const stitchedMedia = mediaItems.map(item => {
                    if (item.isNew) {
                        return { url: `new_file_${uploadIndex++}`, type: item.type };
                    } else {
                        return { url: item.url || '', type: item.type };
                    }
                });
                formData.append('existing_media', JSON.stringify(stitchedMedia));
                console.log('Sending stitched media order (fallback):', JSON.stringify(stitchedMedia));

                // Handle new media uploads
                const newFiles = mediaItems.filter(m => m.isNew);
                newFiles.forEach((item) => {
                    if (item && item.uri) {
                        formData.append('images', {
                            uri: item.uri,
                            type: item.type,
                            name: item.name
                        } as any);
                    }
                });
            }

            console.log('Submitting Product FormData to onSubmit');
            await onSubmit(formData);
        } catch (error) {
            console.error('Error updating product:', error);
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update product');
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
                <Text style={styles.imageSectionTitle}>Product Media & Files</Text>
                <Text style={styles.imageSectionSubtitle}>Manage dynamic media items to display on user product detail carousel</Text>
                
                <View style={styles.mediaGrid}>
                    {mediaItems.map((m, index) => {
                        const filename = m.isNew 
                            ? (m.name || `New File ${index + 1}`) 
                            : (m.url?.split('/').pop() || `Active File ${index + 1}`);
                        
                        const uri = m.isNew ? m.uri : apiService.getFullImageUrl(m.url || '');
                        
                        return (
                            <View key={index} style={styles.mediaCard}>
                                {(() => {
                                    const fileType = normalizeFileType(uri || '', m.type);
                                    if (fileType === 'image' || fileType === 'gif') {
                                        return <Image source={{ uri }} style={styles.uploadedImage} />;
                                    } else if (fileType === 'video') {
                                        return (
                                            <View style={styles.mediaPlaceholderContainer}>
                                                <Ionicons name="play-circle" size={40} color={m.isNew ? "#E91E63" : "#FF69B4"} />
                                                <Text style={styles.mediaPlaceholderText} numberOfLines={1}>Video</Text>
                                            </View>
                                        );
                                    } else {
                                        return (
                                            <View style={styles.mediaPlaceholderContainer}>
                                                <Ionicons name="document-text" size={40} color="#2196F3" />
                                                <Text style={styles.mediaPlaceholderText} numberOfLines={1}>{filename}</Text>
                                            </View>
                                        );
                                    }
                                })()}
                                
                                <View style={styles.orderBadge}>
                                    <Text style={styles.orderBadgeText}>{index + 1}</Text>
                                </View>

                                <View style={[styles.mediaTypeBadge, { backgroundColor: m.isNew ? 'rgba(0,123,255,0.85)' : 'rgba(40,167,69,0.85)' }]}>
                                    <Text style={styles.mediaTypeBadgeText}>{m.isNew ? 'NEW' : 'ACTIVE'}</Text>
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
                                        disabled={index === mediaItems.length - 1}
                                        style={[styles.reorderBarBtn, index === mediaItems.length - 1 && styles.reorderBarBtnDisabled]}
                                    >
                                        <Ionicons name="chevron-forward" size={16} color={index === mediaItems.length - 1 ? "#888" : "#fff"} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}

                    {mediaItems.length === 0 && (
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

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Categories</Text>
                        <TouchableOpacity
                            style={[
                                styles.input,
                                styles.categorySelector,
                                (!editedProduct.categories || editedProduct.categories.length === 0) && styles.inputError
                            ]}
                            onPress={() => setShowCategoryModal(true)}
                        >
                            <Text style={editedProduct.categories && editedProduct.categories.length > 0 ? styles.categoryText : styles.placeholderText}>
                                {editedProduct.categories && editedProduct.categories.length > 0
                                    ? `${editedProduct.categories.length} Selected`
                                    : 'Select Categories'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#666" />
                        </TouchableOpacity>

                        {/* Selected Categories Chips */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 16 }}>
                            {editedProduct.categories?.map((cat) => (
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
                    </View>
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
                onSelectMultiple={handleCategorySelect}
                selectedCategories={(editedProduct.categories || []).map(c => c.name)}
                multiSelect={true}
                onSelect={() => { }} // No-op
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        marginBottom: 8,
    },
    inputError: {
        borderColor: '#dc3545',
        backgroundColor: '#fff5f5',
    },
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
    mediaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
        justifyContent: 'flex-start',
        marginTop: 10,
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
    uploadedImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
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

export default EditProductForm; 