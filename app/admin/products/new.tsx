import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AddProductForm from '../components/AddProductForm';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../../services/api';

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

export default function NewProduct() {
    const router = useRouter();
    const [newProduct, setNewProduct] = useState<NewProductForm>({
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
    const [selectedImages, setSelectedImages] = useState<string[]>([]);

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
            Alert.alert('Error', 'Failed to pick image');
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
                const newImages = [...selectedImages];
                newImages[index] = result.assets[0].uri;
                setSelectedImages(newImages);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
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

            const formData = new FormData();

            // Add required fields
            formData.append('name', String(newProduct.name).trim());
            formData.append('description', String(newProduct.description || '').trim());
            formData.append('price', String(Math.abs(Number(newProduct.price))));
            formData.append('category', newProduct.category);
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

            // Handle images
            selectedImages.forEach((uri, index) => {
                if (uri) {
                    const filename = uri.split('/').pop() || `image${index + 1}.jpg`;
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : 'image/jpeg';

                    formData.append('images', {
                        uri,
                        type,
                        name: filename
                    } as any);
                }
            });

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