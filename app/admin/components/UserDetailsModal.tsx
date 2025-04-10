import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'user';
    total_orders: number;
    total_spent: number;
    created_at: string;
    last_login: string;
    status: 'active' | 'inactive' | 'blocked';
    phone?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        pincode?: string;
    };
    addresses?: Array<{
        id?: number;
        type?: 'home' | 'work' | 'other';
        is_default?: boolean;
        full_name: string;
        phone: string;
        street: string;
        city: string;
        state: string;
        country: string;
        pincode: string;
    }>;
    preferences?: {
        notifications?: boolean;
        newsletter?: boolean;
    };
}

interface UserDetailsModalProps {
    user: User | null;
    visible: boolean;
    onClose: () => void;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
    user,
    visible,
    onClose,
}) => {
    if (!user) return null;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatAmount = (amount: number | undefined): string => {
        if (typeof amount !== 'number') return '0.00';
        return amount.toFixed(2);
    };

    const getStatusColor = (status: User['status']) => {
        switch (status) {
            case 'active':
                return '#4CAF50';
            case 'inactive':
                return '#FFA500';
            case 'blocked':
                return '#DC143C';
            default:
                return '#666';
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>User Details</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent}>
                        {/* Basic Information */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Basic Information</Text>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Name:</Text>
                                <Text style={styles.value}>{user.name}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Email:</Text>
                                <Text style={styles.value}>{user.email}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Phone:</Text>
                                <Text style={styles.value}>{user.phone || 'Not provided'}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Role:</Text>
                                <Text style={[styles.value, styles.badge]}>{user.role}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Status:</Text>
                                <Text style={[styles.value, styles.statusBadge, { backgroundColor: getStatusColor(user.status) }]}>
                                    {user.status}
                                </Text>
                            </View>
                        </View>

                        {/* Address Information */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Addresses</Text>
                            {user.addresses && user.addresses.length > 0 ? (
                                user.addresses.map((address, index) => (
                                    <View key={index} style={styles.addressCard}>
                                        <View style={styles.addressHeader}>
                                            <Text style={styles.addressType}>
                                                {address.type ? address.type.charAt(0).toUpperCase() + address.type.slice(1) : 'Address'} 
                                                {address.is_default && ' (Default)'}
                                            </Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>Full Name:</Text>
                                            <Text style={styles.value}>{address.full_name || 'Not provided'}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>Phone:</Text>
                                            <Text style={styles.value}>{address.phone || 'Not provided'}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>Street:</Text>
                                            <Text style={styles.value}>{address.street || 'Not provided'}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>City:</Text>
                                            <Text style={styles.value}>{address.city || 'Not provided'}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>State:</Text>
                                            <Text style={styles.value}>{address.state || 'Not provided'}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>Country:</Text>
                                            <Text style={styles.value}>{address.country || 'Not provided'}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>Pincode:</Text>
                                            <Text style={styles.value}>{address.pincode || 'Not provided'}</Text>
                                        </View>
                                    </View>
                                ))
                            ) : user.address ? (
                                <View style={styles.addressCard}>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>Street:</Text>
                                        <Text style={styles.value}>{user.address.street || 'Not provided'}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>City:</Text>
                                        <Text style={styles.value}>{user.address.city || 'Not provided'}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>State:</Text>
                                        <Text style={styles.value}>{user.address.state || 'Not provided'}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>Country:</Text>
                                        <Text style={styles.value}>{user.address.country || 'Not provided'}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>Pincode:</Text>
                                        <Text style={styles.value}>{user.address.pincode || 'Not provided'}</Text>
                                    </View>
                                </View>
                            ) : (
                                <Text style={styles.noDataText}>No address information available</Text>
                            )}
                        </View>

                        {/* Activity Information */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Activity</Text>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Total Orders:</Text>
                                <Text style={styles.value}>{user.total_orders || 0}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Total Spent:</Text>
                                <Text style={styles.value}>₹{formatAmount(user.total_spent)}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Joined:</Text>
                                <Text style={styles.value}>{formatDate(user.created_at)}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Last Login:</Text>
                                <Text style={styles.value}>{formatDate(user.last_login)}</Text>
                            </View>
                        </View>

                        {/* Preferences */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Preferences</Text>
                            {user.preferences ? (
                                <>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>Notifications:</Text>
                                        <Text style={styles.value}>
                                            {user.preferences.notifications ? 'Enabled' : 'Disabled'}
                                        </Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>Newsletter:</Text>
                                        <Text style={styles.value}>
                                            {user.preferences.newsletter ? 'Subscribed' : 'Not subscribed'}
                                        </Text>
                                    </View>
                                </>
                            ) : (
                                <Text style={styles.noDataText}>No preference information available</Text>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        width: Dimensions.get('window').width * 0.9,
        maxHeight: Dimensions.get('window').height * 0.8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
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
    closeButton: {
        padding: 4,
    },
    scrollContent: {
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: '#333',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    label: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    value: {
        fontSize: 14,
        color: '#333',
        flex: 2,
        textAlign: 'right',
    },
    badge: {
        textTransform: 'capitalize',
        fontWeight: '500',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    noDataText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
    },
    addressCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    addressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    addressType: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
    },
}); 