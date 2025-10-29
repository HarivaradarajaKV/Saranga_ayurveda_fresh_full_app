import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  id: number;
  text: string;
  isBot: boolean;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    // Show initial greeting after a short delay
    const timer = setTimeout(() => {
      setMessages([
        {
          id: 1,
          text: 'Hi! 👋 How can I help you today?',
          isBot: true,
        },
      ]);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    Animated.spring(animation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleClose = () => {
    Animated.spring(animation, {
      toValue: 0,
      useNativeDriver: true,
    }).start(() => setIsOpen(false));
  };

  const handleSend = () => {
    if (message.trim()) {
      // Add user message
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: message,
        isBot: false,
      }]);
      setMessage('');

      // Simulate bot response
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: 'Thanks for your message! Our team will get back to you soon.',
          isBot: true,
        }]);
      }, 1000);
    }
  };

  const scale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <>
      <TouchableOpacity
        style={styles.chatButton}
        onPress={handleOpen}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
      >
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ scale }] }
          ]}
        >
          <View style={styles.chatContainer}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Customer Support</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.messagesContainer}>
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.message,
                    msg.isBot ? styles.botMessage : styles.userMessage,
                  ]}
                >
                  <Text style={styles.messageText}>{msg.text}</Text>
                </View>
              ))}
            </ScrollView>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Type your message..."
                  multiline
                />
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSend}
                >
                  <Ionicons name="send" size={24} color="#007bff" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chatButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 140 : 120,
    right: 20,
    backgroundColor: '#007bff',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    backgroundColor: '#fff',
    width: '90%',
    height: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  message: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007bff',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 