import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function LiveChatPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'Hello! How can I help you today?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      // Add user message
      const newMessage = {
        id: messages.length + 1,
        text: message.trim(),
        isUser: true,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, newMessage]);
      setMessage('');

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Simulate support response
      setTimeout(() => {
        const supportMessage = {
          id: messages.length + 2,
          text: getAutoResponse(message.trim()),
          isUser: false,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, supportMessage]);
        
        // Scroll to bottom again after response
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }, 1000);
    }
  };

  const getAutoResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return 'Hello! How can I assist you today?';
    } else if (lowerMessage.includes('order')) {
      return 'For order related queries, please provide your order number and I\'ll be happy to help.';
    } else if (lowerMessage.includes('delivery') || lowerMessage.includes('shipping')) {
      return 'Our standard delivery time is 3-5 business days. For more specific information, please provide your order number.';
    } else if (lowerMessage.includes('return') || lowerMessage.includes('refund')) {
      return 'We have a 30-day return policy. Would you like me to guide you through the return process?';
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      return 'Our prices are competitive and we often have special offers. Is there a specific product you\'re interested in?';
    } else {
      return 'Thank you for your message. I\'ll help you with that. Could you please provide more details?';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <Stack.Screen 
          options={{
            title: 'Live Chat Support',
            headerShown: true,
            headerStyle: {
              backgroundColor: '#fff',
            },
            headerShadowVisible: false,
          }}
        />
        
        <Animated.View style={[styles.statusBar, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['#FFF0F5', '#FFE4E1']}
            style={styles.statusGradient}
          >
            <View style={styles.statusIndicator} />
            <Text style={styles.statusText}>Support Online</Text>
          </LinearGradient>
        </Animated.View>

        <View style={styles.mainContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatContainer}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((msg) => (
              <Animated.View
                key={msg.id}
                style={[
                  styles.messageContainer,
                  msg.isUser ? styles.userMessage : styles.supportMessage,
                  { opacity: fadeAnim }
                ]}
              >
                <LinearGradient
                  colors={msg.isUser ? ['#FF69B4', '#FF1493'] : ['#FFF0F5', '#FFE4E1']}
                  style={styles.messageGradient}
                >
                  <Text style={[
                    styles.messageText,
                    msg.isUser ? styles.userMessageText : styles.supportMessageText
                  ]}>
                    {msg.text}
                  </Text>
                  <Text style={[
                    styles.timestamp,
                    msg.isUser ? styles.userTimestamp : styles.supportTimestamp
                  ]}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </LinearGradient>
              </Animated.View>
            ))}
          </ScrollView>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={message}
                onChangeText={setMessage}
                placeholder="Type your message..."
                placeholderTextColor="#999"
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={sendMessage}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#FF69B4', '#FF1493']}
                  style={styles.sendButtonGradient}
                >
                  <Ionicons name="send" size={24} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  statusBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    zIndex: 1,
  },
  statusGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 0,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  statusText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 90 : 70,
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    fontSize: 16,
    color: '#333',
    maxHeight: 100,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#FFE4E1',
  },
  messageContainer: {
    maxWidth: '80%',
    marginBottom: 16,
  },
  messageGradient: {
    padding: 12,
    borderRadius: 20,
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  supportMessage: {
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  supportMessageText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  supportTimestamp: {
    color: '#666',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 