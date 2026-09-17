import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const BusinessCardSkeleton = () => {
  return (
    <View style={styles.cardSkeleton}>
      <Skeleton width="100%" height={150} borderRadius={16} />
      <View style={styles.cardBody}>
        <Skeleton width="70%" height={20} borderRadius={6} style={{ marginTop: 10 }} />
        <Skeleton width="45%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
        <View style={styles.cardFooter}>
          <Skeleton width="30%" height={14} borderRadius={4} />
          <Skeleton width="25%" height={14} borderRadius={4} />
        </View>
      </View>
    </View>
  );
};

export const ProductCardSkeleton = () => {
  return (
    <View style={styles.productSkeleton}>
      <Skeleton width={90} height={90} borderRadius={12} />
      <View style={styles.productInfo}>
        <Skeleton width="80%" height={18} borderRadius={6} />
        <Skeleton width="50%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
        <Skeleton width="35%" height={16} borderRadius={6} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
  cardSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardBody: {
    paddingHorizontal: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  productSkeleton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
});
