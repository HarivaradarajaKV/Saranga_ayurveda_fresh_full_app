import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GenderAvatarProps {
  name: string;
  gender?: 'male' | 'female' | 'other';
  size?: number;
  style?: any;
}

export const GenderAvatar: React.FC<GenderAvatarProps> = ({
  name,
  gender,
  size = 40,
  style
}) => {
  // Extract first letter of name
  const initial = name ? name.charAt(0).toUpperCase() : 'U';
  
  // Determine avatar based on gender or name patterns
  const getAvatarIcon = () => {
    if (gender === 'male') {
      return 'man';
    } else if (gender === 'female') {
      return 'woman';
    } else {
      // Default to person icon
      return 'person';
    }
  };

  const getAvatarColor = () => {
    if (gender === 'male') {
      return '#4A90E2'; // Blue
    } else if (gender === 'female') {
      return '#E91E63'; // Pink
    } else {
      return '#9C27B0'; // Purple
    }
  };

  const getBackgroundColor = () => {
    if (gender === 'male') {
      return '#E3F2FD'; // Light blue
    } else if (gender === 'female') {
      return '#FCE4EC'; // Light pink
    } else {
      return '#F3E5F5'; // Light purple
    }
  };

  return (
    <View style={[
      styles.avatarContainer,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: getBackgroundColor(),
      },
      style
    ]}>
      <Ionicons
        name={getAvatarIcon()}
        size={size * 0.6}
        color={getAvatarColor()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});



