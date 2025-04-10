import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AccordionProps {
  title: string;
  content: string;
}

export default function Accordion({ title, content }: AccordionProps) {
  const [expanded, setExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const toggleExpand = () => {
    const toValue = expanded ? 0 : 1;
    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };

  const bodyHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1000], // Maximum height
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>{title}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#666"
        />
        <Text style={styles.toggleText}>{expanded ? 'On' : 'Off'}</Text> {/* Display On/Off */}
      </TouchableOpacity>
      <Animated.View style={[styles.body, { height: bodyHeight }]}>
        <Text style={styles.content}>{content}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#007bff',
  },
  body: {
    overflow: 'hidden',
  },
  content: {
    padding: 10,
    backgroundColor: '#fff',
  },
});