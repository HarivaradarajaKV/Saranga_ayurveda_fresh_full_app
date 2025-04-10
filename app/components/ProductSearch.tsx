import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProductSearchProps {
    onSearch: (query: string) => void;
    initialCategoryId?: number;
}

export default function ProductSearch({ onSearch }: ProductSearchProps) {
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // Trigger search whenever searchQuery changes
        onSearch(searchQuery);
    }, [searchQuery]);

    return (
        <View style={styles.container}>
            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#666" />
                <TextInput
                    style={styles.input}
                    placeholder="Search products..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholderTextColor="#999"
                />
                {searchQuery !== '' && (
                    <TouchableOpacity
                        onPress={() => setSearchQuery('')}
                    >
                        <Ionicons name="close-circle" size={20} color="#666" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 8,
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#000',
        height: 40,
    }
}); 