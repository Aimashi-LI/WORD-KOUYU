import React, { memo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface TimePickerProps {
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

const TimePicker = memo(({ selectedHour, selectedMinute, onHourChange, onMinuteChange, colors }: TimePickerProps) => {
  return (
    <View style={styles.container}>
      <View style={[styles.pickerWrapper, { backgroundColor: colors.level3, borderColor: colors.border }]}>
        {/* 小时选择器 */}
        <View style={styles.pickerColumn}>
          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>时</Text>
          <Picker
            selectedValue={selectedHour}
            onValueChange={onHourChange}
            style={[styles.picker, { color: colors.textPrimary }]}
            itemStyle={{ color: colors.textPrimary, height: 40 }}
          >
            {HOURS.map(hour => (
              <Picker.Item
                key={hour}
                label={hour.toString().padStart(2, '0')}
                value={hour}
              />
            ))}
          </Picker>
        </View>

        {/* 分隔符 */}
        <Text style={[styles.separator, { color: colors.textPrimary }]}>:</Text>

        {/* 分钟选择器 */}
        <View style={styles.pickerColumn}>
          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>分</Text>
          <Picker
            selectedValue={selectedMinute}
            onValueChange={onMinuteChange}
            style={[styles.picker, { color: colors.textPrimary }]}
            itemStyle={{ color: colors.textPrimary, height: 40 }}
          >
            {MINUTES.map(minute => (
              <Picker.Item
                key={minute}
                label={minute.toString().padStart(2, '0')}
                value={minute}
              />
            ))}
          </Picker>
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

TimePicker.displayName = 'TimePicker';

export default TimePicker;

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    gap: 8,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  picker: {
    height: 120,
  },
  separator: {
    fontSize: 24,
    fontWeight: 'bold',
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
