import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';

interface TimeButtonGridProps {
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
  };
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const MINUTES = [0, 15, 30, 45];

const TimeButtonGrid = memo(({ selectedHour, selectedMinute, onHourChange, onMinuteChange, colors }: TimeButtonGridProps) => {
  return (
    <View style={styles.container}>
      {/* 小时选择 */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>小时</Text>
        <View style={styles.buttonGrid}>
          {HOURS.map(hour => {
            const isActive = selectedHour === hour;
            return (
              <TouchableOpacity
                key={hour}
                onPress={() => onHourChange(hour)}
                style={[
                  styles.button,
                  isActive && styles.buttonActive,
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                  !isActive && { backgroundColor: colors.level3, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    isActive && { color: colors.buttonPrimaryText },
                    !isActive && { color: colors.textSecondary },
                  ]}
                >
                  {hour}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 分钟选择 */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>分钟</Text>
        <View style={styles.buttonGrid}>
          {MINUTES.map(minute => {
            const isActive = selectedMinute === minute;
            return (
              <TouchableOpacity
                key={minute}
                onPress={() => onMinuteChange(minute)}
                style={[
                  styles.button,
                  isActive && styles.buttonActive,
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                  !isActive && { backgroundColor: colors.level3, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    isActive && { color: colors.buttonPrimaryText },
                    !isActive && { color: colors.textSecondary },
                  ]}
                >
                  {minute.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
});

TimeButtonGrid.displayName = 'TimeButtonGrid';

export default TimeButtonGrid;

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  section: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    width: 50,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  buttonActive: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
