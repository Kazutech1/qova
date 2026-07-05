import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '../../../src/theme';
import { Text } from '../../../src/components/common/Text';
import { Ionicons } from '@expo/vector-icons';

export default function CircleChat() {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([
    { id: '1', sender: 'System', text: 'Cycle 4 has started!', type: 'system' },
    { id: '2', sender: 'Michael Chen', text: 'Hey everyone, just sent my contribution!', type: 'user' },
    { id: '3', sender: 'System', text: 'Michael Chen contributed ₦50,000', type: 'system' },
    { id: '4', sender: 'Sarah Johnson', text: 'Me too! Looking forward to this round.', type: 'user' },
    { id: '5', sender: 'System', text: 'Sarah Johnson contributed ₦50,000', type: 'system' },
    { id: '6', sender: 'Tunde Bakare', text: 'When is the next payout date confirmed?', type: 'user' },
  ]);

  const handleSend = () => {
    if (!text.trim()) return;
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'You',
        text: text.trim(),
        type: 'me',
      }
    ]);
    setText('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView 
        style={styles.chatArea} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(msg => (
          <View key={msg.id} style={[
            styles.messageWrapper,
            msg.type === 'system' 
              ? styles.systemWrapper 
              : msg.type === 'me' 
                ? styles.meWrapper 
                : styles.userWrapper
          ]}>
            {msg.type === 'user' && (
              <Text variant="tiny" weight="bold" color={theme.colors.text.secondary} style={styles.senderName}>
                {msg.sender}
              </Text>
            )}
            <View style={[
              styles.bubble,
              msg.type === 'system' 
                ? styles.systemBubble 
                : msg.type === 'me' 
                  ? styles.meBubble 
                  : styles.userBubble
            ]}>
              <Text variant="body" color={
                msg.type === 'system' 
                  ? theme.colors.text.secondary 
                  : msg.type === 'me' 
                    ? '#FFFFFF' 
                    : theme.colors.secondary
              }>
                {msg.text}
              </Text>
            </View>
          </View>
        ))}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton}>
          <Ionicons name="add" size={24} color={theme.colors.text.secondary} />
        </TouchableOpacity>
        <TextInput 
          style={styles.input}
          placeholder="Message circle..."
          placeholderTextColor="rgba(0,0,0,0.3)"
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  chatArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  messageWrapper: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  systemWrapper: {
    alignSelf: 'center',
    maxWidth: '90%',
  },
  userWrapper: {
    alignSelf: 'flex-start',
  },
  meWrapper: {
    alignSelf: 'flex-end',
  },
  senderName: {
    marginBottom: 4,
    marginLeft: 12,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  systemBubble: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: 4,
  },
  meBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 24,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    fontFamily: theme.typography.fonts.body,
    color: '#000000',
  },
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
