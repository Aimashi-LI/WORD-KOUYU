import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Wordbook } from '@/database/types';

interface WordbookListItemProps {
  item: Wordbook;
  onPress: (id: number) => void;
}

const WordbookListItem = React.memo<WordbookListItemProps>(({ item, onPress }) => {
  const theme = useTheme();

  const handlePress = () => {
    onPress(item.id);
  };

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={handlePress}
      activeOpacity={0.6}
    >
      <FontAwesome6 name="folder" size={20} color={theme.primary} />
      <View style={styles.itemContent}>
        <ThemedText variant="body" color={theme.textPrimary}>
          {item.name}
        </ThemedText>
        <ThemedText variant="caption" color={theme.textMuted}>
          {item.word_count} 个单词
        </ThemedText>
      </View>
      <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return prevProps.item.id === nextProps.item.id &&
         prevProps.item.name === nextProps.item.name &&
         prevProps.item.word_count === nextProps.item.word_count;
});

WordbookListItem.displayName = 'WordbookListItem';

export default WordbookListItem;

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    gap: 12,
  },
  itemContent: {
    flex: 1,
  },
});
