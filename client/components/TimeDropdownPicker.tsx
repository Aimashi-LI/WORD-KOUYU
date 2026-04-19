import React, { memo, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';

interface TimeDropdownPickerProps {
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

const TimeDropdownPicker = memo(({ selectedHour, selectedMinute, onHourChange, onMinuteChange, colors }: TimeDropdownPickerProps) => {
  const [showHourDropdown, setShowHourDropdown] = useState(false);
  const [showMinuteDropdown, setShowMinuteDropdown] = useState(false);

  const handleSelectHour = (hour: number) => {
    onHourChange(hour);
    setShowHourDropdown(false);
  };

  const handleSelectMinute = (minute: number) => {
    onMinuteChange(minute);
    setShowMinuteDropdown(false);
  };

  const handlePressOutside = () => {
    if (showHourDropdown || showMinuteDropdown) {
      setShowHourDropdown(false);
      setShowMinuteDropdown(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={1}
        style={styles.pressArea}
        onPress={handlePressOutside}
      >
        <View style={styles.content}>
          {/* 小时选择器 */}
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[
                styles.selectItem,
                { borderColor: colors.border, backgroundColor: colors.level3 },
              ]}
              onPress={() => setShowHourDropdown(!showHourDropdown)}
              activeOpacity={0.6}
            >
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                {selectedHour !== null ? selectedHour.toString().padStart(2, '0') : '小时'}
              </Text>
              <Text style={[styles.arrow, { color: colors.textSecondary }]}>{showHourDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showHourDropdown && (
              <View style={[styles.dropdownWrapper, { left: -35 }]}>
                <View style={[styles.dropdown, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
                  <ScrollView
                    style={styles.dropdownScroll}
                    bounces={false}
                    overScrollMode="never"
                  >
                    {HOURS.map(hour => (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.dropdownItem,
                          selectedHour === hour && styles.dropdownItemActive,
                          selectedHour === hour && { backgroundColor: colors.primary },
                        ]}
                        onPress={() => handleSelectHour(hour)}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            { color: selectedHour === hour ? colors.buttonPrimaryText : '#000000' },
                          ]}
                        >
                          {hour.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
          </View>

          {/* 冒号 */}
          <Text style={[styles.colon, { color: colors.textPrimary }]}>:</Text>

          {/* 分钟选择器 */}
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[
                styles.selectItem,
                { borderColor: colors.border, backgroundColor: colors.level3 },
              ]}
              onPress={() => setShowMinuteDropdown(!showMinuteDropdown)}
              activeOpacity={0.6}
            >
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                {selectedMinute !== null ? selectedMinute.toString().padStart(2, '0') : '分钟'}
              </Text>
              <Text style={[styles.arrow, { color: colors.textSecondary }]}>{showMinuteDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showMinuteDropdown && (
              <View style={[styles.dropdownWrapper, { left: -35 }]}>
                <View style={[styles.dropdown, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
                  <ScrollView
                    style={styles.dropdownScroll}
                    bounces={false}
                    overScrollMode="never"
                  >
                    {MINUTES.map(minute => (
                      <TouchableOpacity
                        key={minute}
                        style={[
                          styles.dropdownItem,
                          selectedMinute === minute && styles.dropdownItemActive,
                          selectedMinute === minute && { backgroundColor: colors.primary },
                        ]}
                        onPress={() => handleSelectMinute(minute)}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            { color: selectedMinute === minute ? colors.buttonPrimaryText : '#000000' },
                          ]}
                        >
                          {minute.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

TimeDropdownPicker.displayName = 'TimeDropdownPicker';

export default TimeDropdownPicker;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressArea: {
    padding: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectWrapper: {
    position: 'relative',
    zIndex: 50,
  },
  selectItem: {
    width: 100,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
    zIndex: 50,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  arrow: {
    fontSize: 10,
  },
  colon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dropdownWrapper: {
    position: 'absolute',
    top: 50,
    left: 0,
    zIndex: 1000,
    elevation: 10,
  },
  dropdown: {
    width: 170,
    maxHeight: 300,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  dropdownItemActive: {
    backgroundColor: '#3B82F6',
  },
  dropdownItemText: {
    fontSize: 16,
  },
});
