import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useChatStore } from '@/presentation/store/useChatStore';

export const ChatToastNotification = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeNotification, hideNotification } = useChatStore();
  const translateY = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (activeNotification) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
      }).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, 5500);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [activeNotification]);

  const handleDismiss = () => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      hideNotification();
    });
  };

  const handlePress = () => {
    if (activeNotification?.isSupport) {
      router.push('/profile/profile' as any);
    } else if (activeNotification?.orderId) {
      router.push('/orders' as any);
    }
    handleDismiss();
  };

  if (!activeNotification) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: Math.max(insets.top + 6, Platform.OS === 'ios' ? 44 : 20),
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toastCard}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.iconBox}>
          <Ionicons
            name={activeNotification.isSupport ? 'headset' : 'chatbubble-ellipses'}
            size={22}
            color="#0F0330"
          />
        </View>

        <View style={styles.textBox}>
          <Text style={styles.titleText} numberOfLines={1}>
            {activeNotification.title}
          </Text>
          <Text style={styles.bodyText} numberOfLines={2}>
            {activeNotification.body}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1238',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#FFC93C',
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFC93C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textBox: {
    flex: 1,
  },
  titleText: {
    color: '#FFC93C',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  bodyText: {
    color: '#F8FAFC',
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
