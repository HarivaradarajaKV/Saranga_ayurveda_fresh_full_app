import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExpandableDescriptionProps {
  description: string;
  maxLines?: number;
  style?: any;
  textStyle?: any;
}

export const ExpandableDescription: React.FC<ExpandableDescriptionProps> = ({
  description,
  maxLines = 4,
  style,
  textStyle
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);

  const handleTextLayout = (event: any) => {
    const { lines } = event.nativeEvent;
    if (lines.length > maxLines) {
      setShowExpandButton(true);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={[styles.container, style]}>
      <Text
        style={[styles.description, textStyle]}
        numberOfLines={isExpanded ? undefined : maxLines}
        onTextLayout={handleTextLayout}
      >
        {description}
      </Text>
      
      {showExpandButton && (
        <TouchableOpacity
          style={styles.expandButton}
          onPress={toggleExpanded}
          activeOpacity={0.7}
        >
          <Text style={styles.expandButtonText}>
            {isExpanded ? 'Show less' : 'Show more details'}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#007AFF"
            style={styles.expandIcon}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    textAlign: 'left',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  expandButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 4,
  },
  expandIcon: {
    marginLeft: 2,
  },
});



