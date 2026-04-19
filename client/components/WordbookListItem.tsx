import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Wordbook } from '@/database/types';

interface WordbookListItemProps {
  item: Wordbook;
  onPress: (id: number) => void;
  colors: {
    primary: string;
    textPrimary: string;
    textMuted: string;
  };
}

const WordbookListItem = React.memo<WordbookListItemProps>(({ item, onPress, colors }) => {
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => onPress(item.id)}
      activeOpacity={0.6}
    >
      <FontAwesome6 name="folder" size={20} color={colors.primary} />
      <View style={styles.itemContent}>
        <Text style={[styles.textName, { color: colors.textPrimary }]}>
          {item.name}
        </Text>
        <Text style={[styles.textCount, { color: colors.textMuted }]}>
          {item.word_count} 个单词
        </Text>
      </View>
      <FontAwesome6 name="chevron-right" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
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
  textName: {
    fontSize: 16,
    fontWeight: '400',
  },
  textCount: {
    fontSize: 12,
    marginTop: 2,
  },
});
