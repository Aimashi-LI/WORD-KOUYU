import React, { memo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

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

  // 滚动到选中项
  useEffect(() => {
    if (hourRef.current && selectedHour !== null && selectedHour !== undefined) {
      hourRef.current.scrollTo({
        y: selectedHour * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, [selectedHour]);

  useEffect(() => {
    if (minuteRef.current && selectedMinute !== null && selectedMinute !== undefined) {
      minuteRef.current.scrollTo({
        y: selectedMinute * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, [selectedMinute]);

  const handleScroll = (ref: React.RefObject<ScrollView>, values: number[], onChange: (value: number) => void) => {
    return (event: any) => {
      const y = event.nativeEvent.contentOffset.y;
      const index = Math.round(y / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
      onChange(values[clampedIndex]);
    };
  };

  const renderItems = (values: number[], selected: number | null) => {
    return values.map((value) => {
      const isSelected = value === selected;
      return (
        <View
          key={value}
          style={[
            styles.item,
            isSelected && styles.itemActive,
            isSelected && { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              styles.itemText,
              { color: isSelected ? colors.buttonPrimaryText : colors.textPrimary },
              isSelected && { fontWeight: '600' },
            ]}
          >
            {value.toString().padStart(2, '0')}
          </Text>
        </View>
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
              contentContainerStyle={styles.pickerContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
              snapToInterval={ITEM_HEIGHT}
              onMomentumScrollEnd={handleScroll(hourRef, HOURS, onHourChange)}
              scrollEventThrottle={16}
            >
              {renderItems(HOURS, selectedHour)}
            </ScrollView>
            {/* 中心线 */}
            <View style={[styles.centerLine, { backgroundColor: colors.border }]} />
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
              contentContainerStyle={styles.pickerContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
              snapToInterval={ITEM_HEIGHT}
              onMomentumScrollEnd={handleScroll(minuteRef, MINUTES, onMinuteChange)}
              scrollEventThrottle={16}
            >
              {renderItems(MINUTES, selectedMinute)}
            </ScrollView>
            {/* 中心线 */}
            <View style={[styles.centerLine, { backgroundColor: colors.border }]} />
          </View>
        </View>
      </View>

      {/* 当前选择 */}
      <View style={styles.selectedTimeDisplay}>
        <Text style={[styles.selectedTimeLabel, { color: colors.textSecondary }]}>
          当前选择：
        </Text>
        <Text style={[styles.selectedTimeValue, { color: colors.primary }]}>
          {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
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
  },
  picker: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
  },
  pickerContent: {
    paddingTop: ITEM_HEIGHT * 2,
    paddingBottom: ITEM_HEIGHT * 2,
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
  centerLine: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2 - ITEM_HEIGHT / 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
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
