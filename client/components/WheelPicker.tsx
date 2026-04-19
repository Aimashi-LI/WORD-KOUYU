import React, { useRef, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDecay,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

interface WheelPickerProps {
  data: number[];
  selectedItem: number;
  onValueChange: (value: number) => void;
  height?: number;
  itemHeight?: number;
  label?: string;
}

const { height: screenHeight } = Dimensions.get('window');

const WheelPicker: React.FC<WheelPickerProps> = ({
  data,
  selectedItem,
  onValueChange,
  height = 150,
  itemHeight = 50,
  label = '',
}) => {
  const theme = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const isScrolling = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 计算初始滚动位置
  const initialScrollOffset = data.indexOf(selectedItem) * itemHeight;

  // 滚动到选中项
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: initialScrollOffset,
        animated: false,
      });
    }
  }, []);

  // 处理滚动
  const handleScroll = useCallback((event: any) => {
    if (!isScrolling.current) {
      isScrolling.current = true;
    }

    // 清除之前的超时
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    const offsetY = event.nativeEvent.contentOffset.y;
    const selectedIndex = Math.round(offsetY / itemHeight);

    if (selectedIndex >= 0 && selectedIndex < data.length) {
      const value = data[selectedIndex];
      if (value !== selectedItem) {
        onValueChange(value);
      }
    }
  }, [data, itemHeight, selectedItem, onValueChange]);

  // 滚动结束
  const handleScrollEnd = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const selectedIndex = Math.round(offsetY / itemHeight);

    if (selectedIndex >= 0 && selectedIndex < data.length) {
      const targetOffset = selectedIndex * itemHeight;
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          y: targetOffset,
          animated: true,
        });
      }

      // 确保选中值正确
      const value = data[selectedIndex];
      onValueChange(value);
    }

    // 标记滚动结束
    scrollTimeoutRef.current = setTimeout(() => {
      isScrolling.current = false;
    }, 300);
  }, [data, itemHeight, onValueChange]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={[styles.container, { height }]}>
      {/* 选中项高亮区域 */}
      <View style={[
        styles.selectionIndicator,
        {
          top: (height - itemHeight) / 2,
          height: itemHeight,
          borderColor: theme.border,
          backgroundColor: theme.backgroundTertiary,
        }
      ]} />

      {/* 滚动列表 */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        snapToAlignment="center"
        decelerationRate={0.968}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        bounces={false}
        contentContainerStyle={{
          paddingVertical: (height - itemHeight) / 2,
        }}
      >
        {data.map((item, index) => {
          const isSelected = item === selectedItem;
          return (
            <View
              key={`${label}-${index}`}
              style={[styles.item, { height: itemHeight }]}
            >
              <Text
                style={[
                  styles.itemText,
                  {
                    color: isSelected ? theme.primary : theme.textMuted,
                    fontSize: isSelected ? 18 : 16,
                    fontWeight: isSelected ? '600' : '400',
                    opacity: isSelected ? 1 : 0.6,
                  }
                ]}
              >
                {item.toString().padStart(2, '0')}{label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  selectionIndicator: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderRadius: 8,
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export default WheelPicker;
