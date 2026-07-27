import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import { usePathname } from 'expo-router';
import { Headphones, Send, X, MessageSquare, ShieldAlert } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { supportService } from '../../services/supportService';
import { useAuth } from '../../hooks/useAuth';


export default function SupportChat() {
  const { darkMode, colors } = useAppTheme();
  const pathname = usePathname();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'ai',
      text: 'Welcome to NovaFXM Customer Support! How can I assist you today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const scrollViewRef = useRef();

  // Hide support chat unless user is logged in AND has standard 'user' role
  const isStandardUser = user && user.role === 'user';
  
  // Also hide on verification screens
  const shouldHide = 
    !isStandardUser ||
    pathname === '/verification' || 
    pathname === '/verification-upload';


  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('openSupportChat', () => {
      setIsOpen(true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isOpen]);

  if (shouldHide) return null;

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;

    // Clear input
    setInputText('');
    setError('');

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      time: timestamp,
    };

    // Update messages with user's input
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // Prepare history to send to backend: { sender: 'user'|'ai', text }
      const history = updatedMessages.map(msg => ({
        sender: msg.sender,
        text: msg.text
      }));

      const response = await supportService.sendMessage(history);
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: response.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Support Chat Error:', err);
      setError(err.response?.data?.message || 'Failed to connect. Make sure your Gemini API key is configured.');
    } finally {
      setLoading(false);
    }
  };

  const activeThemeColor = darkMode ? colors.primary : '#014421';

  // Toggle Chat Widget Open/Close (no floating button, only triggerable via event)
  if (!isOpen) {
    return null;
  }

  const isWeb = Platform.OS === 'web';

  const chatContainerStyle = isWeb
    ? {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 380,
        height: 580,
        zIndex: 9999,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        // React Native Web 0.85 uses the CSS-compatible shadow property.
        boxShadow: `0px 12px 24px ${darkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.15)'}`,
      }
    : {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[
        chatContainerStyle,
        { backgroundColor: darkMode ? colors.panel : '#FFFFFF' }
      ]}
    >
      <View
        className="flex-row items-center justify-between border-b px-4 py-3.5"
        style={{
          borderBottomColor: colors.border,
          backgroundColor: darkMode ? colors.surface : '#FAFAFA',
          borderTopLeftRadius: isWeb ? 20 : 0,
          borderTopRightRadius: isWeb ? 20 : 0,
        }}
      >
        <View className="flex-row items-center gap-2">
          <View className="relative">
            <View
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: darkMode ? '#022C22' : '#E6F4EA' }}
            >
              <Headphones size={20} color={darkMode ? '#34D399' : '#014421'} />
            </View>
            <View className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white bg-green-500" />
          </View>
          <View>
            <Text className="text-sm font-bold" style={{ color: colors.text }}>
              VeltriumFX Support AI
            </Text>
            <Text className="text-[11px] font-medium text-green-500">
              {'Online \u2022 AI Assistant'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setIsOpen(false)}
          className="rounded-full p-2"
          style={{ backgroundColor: darkMode ? colors.surface : '#EAEAEA' }}
        >
          <X size={16} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 py-4"
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        <View
          className="mb-5 rounded-xl border p-3.5"
          style={{
            borderColor: colors.border,
            backgroundColor: darkMode ? colors.surface : '#F9F9F9',
          }}
        >
          <Text
            className="text-center text-[11px] leading-relaxed"
            style={{ color: colors.muted }}
            children="Welcome to the AI Assistant. By typing below, you agree to our Privacy Policy and Terms of Service. This AI support bot may occasionally provide general information."
          />
        </View>

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <View
              key={msg.id}
              className={`mb-4 max-w-[80%] rounded-2xl px-4 py-3 ${
                isUser ? 'self-end' : 'self-start'
              }`}
              style={{
                backgroundColor: isUser
                  ? activeThemeColor
                  : (darkMode ? colors.surface : '#F1F1F1'),
                borderBottomRightRadius: isUser ? 4 : 20,
                borderBottomLeftRadius: isUser ? 20 : 4,
              }}
            >
              <Text
                className="text-[13.5px] leading-relaxed"
                style={{ color: isUser ? '#FFFFFF' : colors.text }}
              >
                {msg.text}
              </Text>
              <Text
                className="mt-1 text-right text-[9px]"
                style={{ color: isUser ? '#E6F4EA' : colors.muted }}
              >
                {msg.time}
              </Text>
            </View>
          );
        })}

        {loading && (
          <View
            className="mb-4 self-start rounded-2xl px-4 py-3 flex-row items-center gap-2"
            style={{
              backgroundColor: darkMode ? colors.surface : '#F1F1F1',
              borderBottomLeftRadius: 4,
            }}
          >
            <ActivityIndicator size="small" color={activeThemeColor} />
            <Text className="text-xs" style={{ color: colors.muted }}>
              AI is writing...
            </Text>
          </View>
        )}

        {error && (
          <View
            className="mb-4 flex-row items-center gap-2 rounded-xl p-3 border"
            style={{
              backgroundColor: darkMode ? '#3A1E1E' : '#FEE2E2',
              borderColor: '#EF4444',
            }}
          >
            <ShieldAlert size={16} color="#EF4444" />
            <Text className="flex-1 text-[11px]" style={{ color: '#EF4444' }}>
              {error}
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        className="flex-row items-center border-t px-3.5 py-3"
        style={{
          borderTopColor: colors.border,
          backgroundColor: darkMode ? colors.surface : '#FAFAFA',
          borderBottomLeftRadius: isWeb ? 20 : 0,
          borderBottomRightRadius: isWeb ? 20 : 0,
        }}
      >
        <TextInput
          className="flex-1 rounded-xl border px-4 py-2.5 text-[13.5px]"
          style={{
            backgroundColor: darkMode ? colors.panel : '#FFFFFF',
            borderColor: colors.border,
            color: colors.text,
            maxHeight: 100,
            outlineStyle: 'none',
          }}
          placeholder="Type your message..."
          placeholderTextColor="#9CA3AF"
          multiline
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputText.trim() || loading}
          className="ml-3 h-10 w-10 items-center justify-center rounded-full"
          style={{
            backgroundColor: !inputText.trim() || loading ? (darkMode ? colors.border : '#E5E7EB') : activeThemeColor,
          }}
        >
          <Send size={16} color={!inputText.trim() || loading ? colors.muted : '#FFFFFF'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
