import React, { memo } from 'react';
import { TouchableOpacity, View, StyleSheet, Text } from 'react-native';

interface PartOfSpeechPickerProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  colors: {
    primary: string;
    buttonPrimaryText: string;
    level3: string;
    border: string;
    textSecondary: string;
  };
}

const PartOfSpeechPicker = memo(({ options, selected, onSelect, colors }: PartOfSpeechPickerProps) => {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isActive = selected === option;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(option)}
            style={[
              styles.button,
              isActive ? styles.buttonActive : styles.buttonInactive,
              isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
              !isActive && { backgroundColor: colors.level3, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.text,
                isActive ? { color: colors.buttonPrimaryText } : { color: colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

PartOfSpeechPicker.displayName = 'PartOfSpeechPicker';

export default PartOfSpeechPicker;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  buttonActive: {},
  buttonInactive: {},
  text: {
    fontSize: 12,
  },
});
