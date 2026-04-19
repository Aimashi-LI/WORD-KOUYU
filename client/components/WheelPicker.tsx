import React from 'react';
import { View, ScrollView, StyleSheet, Text, Dimensions } from 'react-native';
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
  const scrollViewRef = React.useRef<ScrollView>(null);

  // 计算初始滚动位置
  const initialScrollOffset = data.indexOf(selectedItem) * itemHeight;

  // 滚动到选中项
  React.useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: initialScrollOffset,
        animated: false,
      });
    }
  }, []);

  // 处理滚动
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const selectedIndex = Math.round(offsetY / itemHeight);

    if (selectedIndex >= 0 && selectedIndex < data.length) {
      const value = data[selectedIndex];
      if (value !== selectedItem) {
        onValueChange(value);
      }
    }
  };

  // 滚动结束
  const handleScrollEnd = (event: any) => {
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
    }
  };

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
        decelerationRate="fast"
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
      >
        {/* 顶部占位 */}
        <View style={{ height: (height - itemHeight) / 2 }} />

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
                    fontWeight: isSelected ? 'bold' : 'normal',
                  }
                ]}
              >
                {item.toString().padStart(2, '0')}{label}
              </Text>
            </View>
          );
        })}

        {/* 底部占位 */}
        <View style={{ height: (height - itemHeight) / 2 }} />
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
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 8,
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    textAlign: 'center',
  },
});

export default WheelPicker;
