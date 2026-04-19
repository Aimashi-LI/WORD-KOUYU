import React, { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

interface PartOfSpeechPickerProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  theme: any;
}

const PartOfSpeechPicker = memo(({ options, selected, onSelect, theme }: PartOfSpeechPickerProps) => {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((option) => {
        const isActive = selected === option;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(option)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: isActive ? theme.primary : theme.level3,
              borderWidth: 1,
              borderColor: isActive ? theme.primary : theme.border,
            }}
          >
            <ThemedText
              variant="caption"
              color={isActive ? theme.buttonPrimaryText : theme.textSecondary}
              numberOfLines={1}
            >
              {option}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

PartOfSpeechPicker.displayName = 'PartOfSpeechPicker';

export default PartOfSpeechPicker;
