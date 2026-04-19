import React, { memo, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';

interface WheelTimePickerProps {
  selectedHour: number;
  selectedMinute: number;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  colors: {
    primary: string;
    buttonPrimaryText: string;
    level3: string;
    border: string;
    textSecondary: string;
    textPrimary: string;
  };
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

const WheelTimePicker = memo(({ selectedHour, selectedMinute, onHourChange, onMinuteChange, colors }: WheelTimePickerProps) => {
  const hourRef = useRef<ScrollView>(null);
  const minuteRef = useRef<ScrollView>(null);
  const [hourScrollY] = useState(new Animated.Value(0));
  const [minuteScrollY] = useState(new Animated.Value(0));

  // 初始化滚动位置
  useEffect(() => {
    if (hourRef.current && selectedHour !== null && selectedHour !== undefined) {
      hourRef.current.scrollTo({
        y: selectedHour * ITEM_HEIGHT,
        animated: false,
      });
      hourScrollY.setValue(selectedHour * ITEM_HEIGHT);
    }
  }, []);

  useEffect(() => {
    if (minuteRef.current && selectedMinute !== null && selectedMinute !== undefined) {
      minuteRef.current.scrollTo({
        y: selectedMinute * ITEM_HEIGHT,
        animated: false,
      });
      minuteScrollY.setValue(selectedMinute * ITEM_HEIGHT);
    }
  }, []);

  const handleScroll = (event: any, values: number[], onChange: (value: number) => void) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
    onChange(values[clampedIndex]);
  };

  const renderItems = (values: number[], scrollY: Animated.Value, selected: number | null) => {
    return values.map((value) => {
      const opacity = scrollY.interpolate({
        inputRange: [(value - 2) * ITEM_HEIGHT, (value - 1) * ITEM_HEIGHT, value * ITEM_HEIGHT, (value + 1) * ITEM_HEIGHT, (value + 2) * ITEM_HEIGHT],
        outputRange: [0.3, 0.6, 1, 0.6, 0.3],
      });

      const scale = scrollY.interpolate({
        inputRange: [(value - 1) * ITEM_HEIGHT, value * ITEM_HEIGHT, (value + 1) * ITEM_HEIGHT],
        outputRange: [0.8, 1.1, 0.8],
      });

      const isSelected = value === selected;

      return (
        <Animated.View key={value} style={[
          styles.item,
          { opacity, transform: [{ scale }] },
          isSelected && styles.itemActive,
          isSelected && { backgroundColor: colors.primary },
        ]}>
          <Animated.Text
            style={[
              styles.itemText,
              { color: isSelected ? colors.buttonPrimaryText : colors.textPrimary },
              isSelected && { fontWeight: '600' },
            ]}
          >
            {value.toString().padStart(2, '0')}
          </Animated.Text>
        </Animated.View>
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.pickerWrapper, { backgroundColor: colors.level3, borderColor: colors.border }]}>
        {/* 小时滚轮 */}
        <View style={styles.pickerColumn}>
          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>时</Text>
          <View style={styles.pickerContainer}>
            <ScrollView
              ref={hourRef}
              style={styles.picker}
              showsVerticalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
              snapToInterval={ITEM_HEIGHT}
              snapToAlignment="start"
              onMomentumScrollEnd={(event) => handleScroll(event, HOURS, onHourChange)}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: hourScrollY } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
            >
              <View style={{ paddingTop: ITEM_HEIGHT * 2, paddingBottom: ITEM_HEIGHT * 2 }}>
                {renderItems(HOURS, hourScrollY, selectedHour)}
              </View>
            </ScrollView>
            {/* 中心选中区域背景 */}
            <View style={[styles.selectedZone, { backgroundColor: colors.level3, opacity: 0.3 }]} />
          </View>
        </View>

        {/* 分隔符 */}
        <Text style={[styles.separator, { color: colors.textPrimary }]}>:</Text>

        {/* 分钟滚轮 */}
        <View style={styles.pickerColumn}>
          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>分</Text>
          <View style={styles.pickerContainer}>
            <ScrollView
              ref={minuteRef}
              style={styles.picker}
              showsVerticalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
              snapToInterval={ITEM_HEIGHT}
              snapToAlignment="start"
              onMomentumScrollEnd={(event) => handleScroll(event, MINUTES, onMinuteChange)}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: minuteScrollY } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
            >
              <View style={{ paddingTop: ITEM_HEIGHT * 2, paddingBottom: ITEM_HEIGHT * 2 }}>
                {renderItems(MINUTES, minuteScrollY, selectedMinute)}
              </View>
            </ScrollView>
            {/* 中心选中区域背景 */}
            <View style={[styles.selectedZone, { backgroundColor: colors.level3, opacity: 0.3 }]} />
          </View>
        </View>
      </View>

      {/* 当前选择 */}
      <View style={styles.selectedTimeDisplay}>
        <Text style={[styles.selectedTimeLabel, { color: colors.textSecondary }]}>
          当前选择：
        </Text>
        <Text style={[styles.selectedTimeValue, { color: colors.primary }]}>
          {selectedHour !== null && selectedHour !== undefined
            ? selectedHour.toString().padStart(2, '0')
            : '00'}:{selectedMinute !== null && selectedMinute !== undefined
            ? selectedMinute.toString().padStart(2, '0')
            : '00'}
        </Text>
      </View>
    </View>
  );
});

WheelTimePicker.displayName = 'WheelTimePicker';

export default WheelTimePicker;

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  pickerContainer: {
    position: 'relative',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    overflow: 'hidden',
  },
  picker: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  itemActive: {},
  itemText: {
    fontSize: 16,
  },
  selectedZone: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: 8,
    pointerEvents: 'none',
  },
  separator: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingTop: 20,
  },
  selectedTimeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  selectedTimeLabel: {
    fontSize: 14,
  },
  selectedTimeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});
