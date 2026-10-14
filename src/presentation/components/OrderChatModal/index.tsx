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
import { igoApi } from '@/infrastructure/api/igo.api';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: string;
}

interface OrderChatModalProps {
  visible: boolean;
  onClose: () => void;
  order: any;
  currentUser: any;
}

export const OrderChatModal = ({
  visible,
  onClose,
  order,
  currentUser,
}: OrderChatModalProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const orderId = order?.id;
  const driver = order?.deliveryUser;
  const client = order?.user;

  // Detectar si el usuario actual que tiene la app abierta es el motorizado/repartidor
  const isDriverUser =
    currentUser?.roles?.includes('empleado') ||
    currentUser?.roles?.includes('motorizado') ||
    currentUser?.roles?.includes('repartidor') ||
    currentUser?.roles?.includes('worker') ||
    currentUser?.roles?.includes('driver');

  const myRole = isDriverUser ? 'driver' : 'client';
  const otherPartyName = isDriverUser
    ? (client?.fullName || client?.fullname || 'Cliente IGO')
    : (driver?.fullName || driver?.fullname || 'Motorizado IGO');

  const otherPartyPhone = isDriverUser
    ? (client?.phone || client?.phoneNumber || order?.contactPhone)
    : (driver?.phone || driver?.phoneNumber);

  // Cargar historial inicial de mensajes
  useEffect(() => {
    if (!visible || !orderId) return;

    if (Array.isArray(order?.chatMessages)) {
      setMessages(order.chatMessages);
    }

    const socket = getSocket();

    const handleNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    socket.on(`order:${orderId}:message`, handleNewMessage);

    return () => {
      socket.off(`order:${orderId}:message`, handleNewMessage);
    };
  }, [visible, orderId]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !orderId || isSending) return;

    setIsSending(true);
    setInputText('');

    const newMsg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      senderId: currentUser?.id || myRole,
      senderName: currentUser?.fullName || currentUser?.fullname || (isDriverUser ? 'Motorizado IGO' : 'Cliente'),
      senderRole: myRole,
      text,
      timestamp: new Date().toISOString(),
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, newMsg]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const socket = getSocket();
      socket.emit('order:send_message', {
        orderId,
        ...newMsg,
      });

      // También guardar en backend via HTTP para persistencia garantizada
      await igoApi.post(`/orders/${orderId}/chat`, newMsg).catch(() => {});
    } catch (err) {
      console.warn('Error enviando mensaje de chat:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSharePhone = () => {
    const phone = currentUser?.phone || currentUser?.telefono || currentUser?.phoneNumber;
    if (phone) {
      handleSendMessage(`📱 Mi número de contacto es: ${phone}`);
    } else {
      Alert.prompt
        ? Alert.prompt('Compartir Teléfono', 'Ingresa tu número para enviarlo en el chat:', (val) => {
            if (val) handleSendMessage(`📱 Mi número de contacto es: ${val}`);
          })
        : handleSendMessage('📱 Por favor indícame tu número para comunicarme contigo.');
    }
  };

  const quickReplies = isDriverUser
    ? [
        '🛵 Ya voy en camino con tu pedido',
        '📍 ¡Ya llegué! Estoy afuera esperándote',
        '🚪 Por favor, ¿puedes salir a la entrada?',
        '📞 Te estoy llamando a tu teléfono',
      ]
    : [
        '👋 Ya salgo a recibirte',
        '🚪 ¿Por cuál portón estás?',
        '🏠 Casa con portón negro',
        '📍 Estoy en la entrada principal',
      ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <View style={[styles.avatarCircle, { backgroundColor: isDriverUser ? '#E0F2FE' : '#FEF3C7' }]}>
                <Ionicons
                  name={isDriverUser ? 'person' : 'bicycle'}
                  size={20}
                  color={isDriverUser ? '#0284C7' : '#D97706'}
                />
              </View>
              <View>
                <Text style={styles.driverName}>
                  {otherPartyName}
                </Text>
                <Text style={styles.orderSubtitle}>
                  Orden #{String(order?.orderNumber || '').padStart(4, '0')} • {isDriverUser ? 'Cliente' : 'Repartidor'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Quick Actions Row */}
          <View style={styles.quickActionsBar}>
            <TouchableOpacity style={styles.sharePhoneBtn} onPress={handleSharePhone}>
              <Ionicons name="call" size={14} color="#000" style={{ marginRight: 4 }} />
              <Text style={styles.sharePhoneText}>Compartir Mi Teléfono</Text>
            </TouchableOpacity>

            {otherPartyPhone && (
              <TouchableOpacity
                style={styles.callDriverBtn}
                onPress={() => Linking.openURL(`tel:${otherPartyPhone}`)}
              >
                <Ionicons name="call-outline" size={14} color="#333" style={{ marginRight: 4 }} />
                <Text style={styles.callDriverText}>Llamar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Messages list */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isSupport = item.senderRole === 'soporte' || item.senderRole === 'admin';
              const isMe =
                item.senderId === currentUser?.id ||
                (isDriverUser
                  ? item.senderRole === 'driver' || item.senderRole === 'motorizado'
                  : item.senderRole === 'client');

              return (
                <View
                  style={[
                    styles.messageBubble,
                    isSupport
                      ? { alignSelf: 'center', backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B', maxWidth: '88%' }
                      : isMe
                      ? styles.myMessageBubble
                      : styles.otherMessageBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.senderLabel,
                      isSupport && { color: '#B45309', fontWeight: 'bold' },
                    ]}
                  >
                    {isSupport ? '🛡️ Soporte IGO' : isMe ? 'Tú' : item.senderName || (item.senderRole === 'driver' ? 'Motorizado' : 'Cliente')}
                  </Text>
                  <Text style={[styles.messageText, isMe && styles.myMessageText]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.timeLabel, isMe && styles.myTimeLabel]}>
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={40} color="#9CA3AF" />
                <Text style={styles.emptyText}>
                  {isDriverUser
                    ? 'Inicia la conversación con el cliente aquí.'
                    : 'Inicia la conversación con tu conductor aquí.'}
                </Text>
              </View>
            }
          />

          {/* Quick Replies Carousel */}
          <View style={styles.quickRepliesContainer}>
            {quickReplies.map((qr, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.quickReplyChip}
                onPress={() => handleSendMessage(qr)}
              >
                <Text style={styles.quickReplyText}>{qr}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input Bar */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={isDriverUser ? 'Escribe un mensaje al cliente...' : 'Escribe un mensaje al motorizado...'}
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={250}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="send" size={18} color="#000" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    display: 'flex',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FCD116',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  orderSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  quickActionsBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sharePhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCD116',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sharePhoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  callDriverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  callDriverText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  messagesList: {
    padding: 16,
    gap: 10,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#FCD116',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 19,
  },
  myMessageText: {
    color: '#000000',
    fontWeight: '500',
  },
  timeLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  myTimeLabel: {
    color: 'rgba(0,0,0,0.5)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  quickRepliesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  quickReplyChip: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickReplyText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#111827',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FCD116',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
});
