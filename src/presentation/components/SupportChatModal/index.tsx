import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSocket } from '@/infrastructure/services/socket.service';
import { useThemeStore } from '@/presentation/store/useThemeStore';

interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string; // 'client' | 'admin'
  text: string;
  timestamp: string;
}

interface SupportChatModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: any;
}

export const SupportChatModal = ({
  visible,
  onClose,
  currentUser,
}: SupportChatModalProps) => {
  const { colors, isDark } = useThemeStore();
  const [messages, setMessages] = useState<SupportMessage[]>([
    {
      id: 'welcome-1',
      senderId: 'admin-igo',
      senderName: 'Soporte IGO',
      senderRole: 'admin',
      text: '¡Hola! Bienvenido al centro de atención y soporte en tiempo real de IGO. ¿En qué podemos ayudarte hoy?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const userId = currentUser?.id;
  const userName = currentUser?.fullName || currentUser?.fullname || currentUser?.email || 'Usuario';

  useEffect(() => {
    if (!visible || !userId) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (msg: SupportMessage) => {
      setMessages((prev) => {
        // Evitar duplicados por id o por coincidencia exacta de texto y tiempo reciente
        if (prev.some((m) => m.id === msg.id)) return prev;
        if (
          prev.some(
            (m) =>
              m.senderId === msg.senderId &&
              m.text === msg.text &&
              Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 3500
          )
        ) {
          return prev;
        }
        return [...prev, msg];
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    socket.on(`support:${userId}:message`, handleNewMessage);

    return () => {
      socket.off(`support:${userId}:message`, handleNewMessage);
    };
  }, [visible, userId]);

  const handleSendMessage = () => {
    const text = inputText.trim();
    if (!text || !userId || isSending) return;

    setIsSending(true);
    setInputText('');

    const newMsg: SupportMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      userName,
      senderId: userId,
      senderName: userName,
      senderRole: 'client',
      text,
      timestamp: new Date().toISOString(),
    } as any;

    // Optimistic UI update
    setMessages((prev) => [...prev, newMsg]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const socket = getSocket();
      if (socket) {
        socket.emit('support:send_message', newMsg);
      }
    } catch (err) {
      console.warn('Error enviando mensaje de soporte:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const message = encodeURIComponent(
      `Hola equipo de IGO Soporte, me comunico desde la app. Mi nombre es ${userName} (${currentUser?.email || ''}). Necesito asistencia.`
    );
    Linking.openURL(`https://wa.me/584127687819?text=${message}`).catch(() => {
      Alert.alert('Atención', 'No se pudo abrir WhatsApp. Puedes escribir al 0412-7687819.');
    });
  };

  const renderItem = ({ item }: { item: SupportMessage }) => {
    const isMe = item.senderRole === 'client';
    const timeFormatted = new Date(item.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowOther,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.messageBubbleMe : [styles.messageBubbleOther, { backgroundColor: colors.card, borderColor: colors.cardBorder }],
          ]}
        >
          <View style={styles.bubbleHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {!isMe && <Ionicons name="shield-checkmark" size={13} color="#0284C7" />}
              <Text style={[styles.senderName, isMe ? styles.senderNameMe : styles.senderNameOther]}>
                {isMe ? 'Tú' : 'Administrador IGO'}
              </Text>
            </View>
            <Text style={[styles.messageTime, isMe ? styles.messageTimeMe : { color: colors.textMuted }]}>
              {timeFormatted}
            </Text>
          </View>
          <Text style={[styles.messageText, isMe ? styles.messageTextMe : { color: colors.text }]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER DEL CHAT DE SOPORTE */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Atención y Soporte IGO</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.headerSubtitle}>Administrador en línea</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.whatsappBtn, { backgroundColor: isDark ? '#143825' : '#F0FDF4', borderColor: isDark ? '#1C5C38' : '#DCFCE7' }]} onPress={handleOpenWhatsApp} activeOpacity={0.8}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </TouchableOpacity>
        </View>

        {/* BANNER INFORMATIVO */}
        <View style={[styles.infoBanner, { backgroundColor: isDark ? '#122540' : '#F0F9FF', borderBottomColor: isDark ? '#1E3A63' : '#E0F2FE' }]}>
          <Ionicons name="shield-checkmark" size={16} color="#0088CC" style={{ marginRight: 6 }} />
          <Text style={[styles.infoBannerText, { color: isDark ? '#7DD3FC' : '#0369A1' }]}>
            Canal directo con el administrador para resolver cualquier inquietud de pedidos o cuenta.
          </Text>
        </View>

        {/* LISTA DE MENSAJES */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* BARRA DE ENTRADA DE TEXTO */}
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text, borderWidth: 1 }]}
            placeholder="Escribe tu mensaje a soporte..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={400}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isSending) && [styles.sendBtnDisabled, { backgroundColor: isDark ? '#2C1D54' : '#E2E8F0' }]]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#0F0330" />
            ) : (
              <Ionicons name="send" size={18} color="#0F0330" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 20,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  whatsappBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  messageBubbleMe: {
    backgroundColor: '#FFC93C',
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
  },
  senderNameMe: {
    color: '#0F0330',
  },
  senderNameOther: {
    color: '#0284C7',
  },
  messageTime: {
    fontSize: 10,
  },
  messageTimeMe: {
    color: 'rgba(15, 3, 48, 0.6)',
  },
  messageTimeOther: {
    color: '#94A3B8',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#0F0330',
    fontWeight: '500',
  },
  messageTextOther: {
    color: '#1E293B',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    backgroundColor: '#F1F5F9',
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFC93C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
});
