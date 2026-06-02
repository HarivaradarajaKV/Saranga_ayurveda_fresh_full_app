import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AddProductForm, { MediaAsset } from '../components/AddProductForm';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../../services/api';

interface NewProductForm {
    name: string;
    description: string;
    price: number;
    category: string;
    category_id?: number;
    selectedCategories: { id: number; name: string }[];
    stock_quantity: number;
    usage_instructions: string;
    size: string;
    benefits: string;
    ingredients: string;
    product_details: string;
    offer_percentage: number;
}

export default function NewProduct() {
    const router = useRouter();
    const [newProduct, setNewProduct] = useState<NewProductForm>({
        name: '',
        description: '',
        price: 0,
        category: '',
        selectedCategories: [],
        stock_quantity: 0,
        usage_instructions: '',
        size: '',
        benefits: '',
        ingredients: '',
        product_details: '',
        offer_percentage: 0
    });
    const [selectedImages, setSelectedImages] = useState<MediaAsset[]>([]);

    const handleImagePick = (index: number) => {
        // Deprecated: Media upload is now managed inline inside AddProductForm
    };

    const handleAddProduct = async () => {
        try {
            // Validate required fields
            if (!newProduct.name?.trim()) {
                Alert.alert('Error', 'Product name is required');
                return;
            }
            if (!newProduct.price || newProduct.price <= 0) {
                Alert.alert('Error', 'Please enter a valid price in rupees');
                return;
            }
            if (!newProduct.category?.trim()) {
                Alert.alert('Error', 'Please select a category');
                return;
            }
            if (!newProduct.stock_quantity || newProduct.stock_quantity < 0) {
                Alert.alert('Error', 'Please enter a valid stock quantity');
                return;
            }

            if (newProduct.selectedCategories.length === 0) {
                Alert.alert('Error', 'Please select at least one category');
                return;
            }

            const formData = new FormData();

            // Add required fields
            formData.append('name', String(newProduct.name).trim());
            formData.append('description', String(newProduct.description || '').trim());
            formData.append('price', String(Math.abs(Number(newProduct.price))));

            // Add category info
            // Primary category (first selected)
            const primaryCategory = newProduct.selectedCategories[0];
            formData.append('category_id', String(primaryCategory.id));
            formData.append('category', primaryCategory.name);

            // All categories for relation
            formData.append('category_ids', JSON.stringify(newProduct.selectedCategories.map(c => c.id)));

            formData.append('stock_quantity', String(Math.max(0, Number(newProduct.stock_quantity))));

            // Add optional fields
            if (newProduct.usage_instructions) {
                formData.append('usage_instructions', String(newProduct.usage_instructions).trim());
            }
            if (newProduct.size) {
                formData.append('size', String(newProduct.size).trim());
            }
            if (newProduct.benefits) {
                formData.append('benefits', String(newProduct.benefits).trim());
            }
            if (newProduct.ingredients) {
                formData.append('ingredients', String(newProduct.ingredients).trim());
            }
            if (newProduct.product_details) {
                formData.append('product_details', String(newProduct.product_details).trim());
            }
            if (newProduct.offer_percentage) {
                formData.append('offer_percentage', String(Math.max(0, Math.min(100, Number(newProduct.offer_percentage)))));
            }

            let useDirectUpload = false;
            let validMediaItems: Array<{ url: string; type: string }> = [];

            try {
                console.log('[Direct Upload] Attempting secure signed URL direct uploads for adding product from dedicated screen...');
                
                const mediaItems = await Promise.all(
                    selectedImages.map(async (item) => {
                        if (item && item.uri) {
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
                        }
                        return null;
                    })
                );

                validMediaItems = mediaItems.filter(Boolean) as Array<{ url: string; type: string }>;
                useDirectUpload = true;
                formData.append('existing_media', JSON.stringify(validMediaItems));
                console.log('Sending direct stitched media order:', JSON.stringify(validMediaItems));
            } catch (err) {
                console.warn('[Direct Upload] Failed or not supported, falling back to backend multi-part upload:', err);
                useDirectUpload = false;
            }

            if (!useDirectUpload) {
                // Fallback: Retain original upload method
                if (selectedImages.length > 0) {
                    selectedImages.forEach((item) => {
                        if (item && item.uri) {
                            formData.append('images', {
                                uri: item.uri,
                                type: item.type,
                                name: item.name
                            } as any);
                        }
                    });
                }
            }

            const response = await apiService.addProduct(formData);
            
            if (response.error) {
                throw new Error(response.error);
            }

            Alert.alert('Success', 'Product added successfully', [
                {
                    text: 'OK',
                    onPress: () => router.back()
                }
            ]);
        } catch (error: any) {
            console.error('Error adding product:', error);
            Alert.alert(
                'Error',
                error.message || 'Failed to add product'
            );
        }
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Add New Product',
                    headerStyle: {
                        backgroundColor: '#1a1a1a',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            />
            <View style={styles.container}>
                <ScrollView>
                    <AddProductForm
                        onSubmit={handleAddProduct}
                        newProduct={newProduct}
                        setNewProduct={setNewProduct}
                        selectedImages={selectedImages}
                        setSelectedImages={setSelectedImages}
                        handleImagePick={handleImagePick}
                    />
                </ScrollView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
}); 