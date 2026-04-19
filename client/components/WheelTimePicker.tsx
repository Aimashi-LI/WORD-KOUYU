import React, { memo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

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

  // 初始化滚动位置
  useEffect(() => {
    if (hourRef.current && selectedHour !== null && selectedHour !== undefined) {
      hourRef.current.scrollTo({
        y: selectedHour * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, []);

  useEffect(() => {
    if (minuteRef.current && selectedMinute !== null && selectedMinute !== undefined) {
      minuteRef.current.scrollTo({
        y: selectedMinute * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, []);

  const handleScroll = (event: any, values: number[], onChange: (value: number) => void) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
    onChange(values[clampedIndex]);
  };

  const renderItems = (values: number[], selected: number | null) => {
    return values.map((value) => (
      <View
        key={value}
        style={styles.item}
      >
        <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
          {value.toString().padStart(2, '0')}
        </Text>
      </View>
    ));
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
              scrollEventThrottle={16}
            >
              <View style={{ paddingTop: ITEM_HEIGHT * 2, paddingBottom: ITEM_HEIGHT * 2 }}>
                {renderItems(HOURS, selectedHour)}
              </View>
            </ScrollView>
            {/* 选中框 */}
            <View style={[styles.selectedFrame, { borderColor: colors.primary }]} />
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
              scrollEventThrottle={16}
            >
              <View style={{ paddingTop: ITEM_HEIGHT * 2, paddingBottom: ITEM_HEIGHT * 2 }}>
                {renderItems(MINUTES, selectedMinute)}
              </View>
            </ScrollView>
            {/* 选中框 */}
            <View style={[styles.selectedFrame, { borderColor: colors.primary }]} />
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
  },
  selectedFrame: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 8,
    right: 8,
    height: ITEM_HEIGHT,
    borderWidth: 2,
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
