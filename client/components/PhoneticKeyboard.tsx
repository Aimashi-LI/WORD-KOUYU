import React from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useMemo } from 'react';
import { Spacing, BorderRadius } from '@/constants/theme';

// 常用音标符号
const VOWELS = [
  'iː', 'ɪ', 'ʊ', 'uː', 'eɪ', 'aɪ', 'ɔɪ', 'oʊ', 'aʊ', 'æ',
  'ɑː', 'ɒ', 'ɔː', 'ə', 'ʌ', 'e', 'ɪə', 'eə', 'ʊə', 'ɜː',
];

const CONSONANTS = [
  'p', 'b', 't', 'd', 'k', 'ɡ', 'f', 'v', 'θ', 'ð',
  's', 'z', 'ʃ', 'ʒ', 'h', 'tʃ', 'dʒ', 'm', 'n', 'ŋ',
  'l', 'r', 'w', 'j',
];

const SYMBOLS = [
  'ˈ', 'ˌ', '.', ':', '/', '-', ' ', 'ː',
];

const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export interface PhoneticKeyboardProps {
  onKeyPress: (key: string) => void;
  onDelete?: () => void;
}

export function PhoneticKeyboard({ onKeyPress, onDelete }: PhoneticKeyboardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.keyboardContainer}>
      {/* 元音区 */}
      <View style={styles.keyboardSection}>
        <ThemedText variant="caption" color={theme.textSecondary} style={styles.sectionTitle}>
          元音
        </ThemedText>
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.keyboardScroll}>
            <View style={styles.keyboardRow}>
              {VOWELS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={styles.keyboardKey}
                  onPress={() => onKeyPress(key)}
                >
                  <ThemedText variant="body" color={theme.textPrimary}>{key}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* 辅音区 */}
      <View style={styles.keyboardSection}>
        <ThemedText variant="caption" color={theme.textSecondary} style={styles.sectionTitle}>
          辅音
        </ThemedText>
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.keyboardScroll}>
            <View style={styles.keyboardRow}>
              {CONSONANTS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={styles.keyboardKey}
                  onPress={() => onKeyPress(key)}
                >
                  <ThemedText variant="body" color={theme.textPrimary}>{key}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* 符号区 */}
      <View style={styles.keyboardSection}>
        <ThemedText variant="caption" color={theme.textSecondary} style={styles.sectionTitle}>
          符号
        </ThemedText>
        <View style={styles.keyboardRow}>
          {SYMBOLS.map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.keyboardKey}
              onPress={() => onKeyPress(key)}
            >
              <ThemedText variant="body" color={theme.primary}>{key}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 删除键 */}
      {onDelete && (
        <TouchableOpacity
          style={[styles.keyboardKey, styles.deleteKey]}
          onPress={onDelete}
        >
          <ThemedText variant="body" color={theme.error}>⌫ 删除</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    keyboardContainer: {
      backgroundColor: theme.backgroundRoot,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      padding: Spacing.md,
      gap: Spacing.md,
    },
    keyboardSection: {
      gap: Spacing.xs,
    },
    sectionTitle: {
      fontWeight: '600',
      marginBottom: Spacing.xs,
    },
    keyboardScroll: {
      width: '100%',
    },
    keyboardRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    keyboardKey: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      minWidth: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    deleteKey: {
      backgroundColor: `${theme.error}10`,
      borderColor: theme.error,
      minWidth: 80,
    },
  });
}
