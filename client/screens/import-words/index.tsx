import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import * as DocumentPicker from 'expo-document-picker';
import { createStyles } from './styles';
import { createWords } from '@/database/wordDao';
import { initDatabase } from '@/database';
import { NewWord, ImportWord } from '@/database/types';

export default function ImportWordsScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  
  const [loading, setLoading] = useState(false);
  const [importCount, setImportCount] = useState(0);

  const parseTxtFile = (content: string): ImportWord[] => {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map(line => ({
      word: line.trim(),
      definition: '待补充',
      mnemonic: '待补充',
    }));
  };

  const parseCsvFile = (content: string): ImportWord[] => {
    const lines = content.split('\n').filter(line => line.trim());
    const words: ImportWord[] = [];
    
    // 跳过表头
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 2) {
        words.push({
          word: parts[0],
          phonetic: parts[1],
          definition: parts[2] || '待补充',
          split: parts[3],
          mnemonic: parts[4] || '待补充',
          example: parts[5],
        });
      }
    }
    
    return words;
  };

  const handleFileSelect = async () => {
    try {
      setLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'text/csv', 'application/vnd.ms-excel', 'text/comma-separated-values'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setLoading(false);
        return;
      }

      const file = result.assets[0];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      // 读取文件内容
      const fileContent = await fetch(file.uri).then(r => r.text());

      let importWords: ImportWord[] = [];

      if (fileExtension === 'txt') {
        importWords = parseTxtFile(fileContent);
      } else if (fileExtension === 'csv') {
        importWords = parseCsvFile(fileContent);
      } else {
        Alert.alert('错误', '仅支持 .txt 和 .csv 格式');
        setLoading(false);
        return;
      }

      if (importWords.length === 0) {
        Alert.alert('提示', '文件中没有找到有效的单词');
        setLoading(false);
        return;
      }

      // 导入数据库
      await initDatabase();
      
      const newWords: NewWord[] = importWords.map(w => ({
        word: w.word,
        phonetic: w.phonetic,
        definition: w.definition,
        split: w.split,
        mnemonic: w.mnemonic || '待补充',
      }));

      await createWords(newWords);
      setImportCount(newWords.length);
      
      Alert.alert('成功', `成功导入 ${newWords.length} 个单词`, [
        { text: '确定', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('导入失败:', error);
      Alert.alert('错误', '导入失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* 标题栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h2" color={theme.textPrimary}>批量导入</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* 导入选项 */}
        <View style={styles.content}>
          <ThemedView level="default" style={styles.card}>
            <FontAwesome6 name="file-import" size={48} color={theme.primary} style={styles.icon} />
            <ThemedText variant="h3" color={theme.textPrimary} style={styles.cardTitle}>
              选择文件导入
            </ThemedText>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.cardText}>
              支持 .txt 和 .csv 格式文件
            </ThemedText>
            <TouchableOpacity 
              style={styles.importButton}
              onPress={handleFileSelect}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.buttonPrimaryText} />
              ) : (
                <ThemedText variant="body" color={theme.buttonPrimaryText}>
                  选择文件
                </ThemedText>
              )}
            </TouchableOpacity>
          </ThemedView>

          {/* 格式说明 */}
          <ThemedView level="tertiary" style={styles.infoCard}>
            <ThemedText variant="h3" color={theme.textPrimary} style={styles.infoTitle}>
              文件格式说明
            </ThemedText>
            
            <ThemedText variant="body" color={theme.textSecondary} style={styles.infoSubtitle}>
              TXT 格式：
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.infoText}>
              每行一个单词
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.infoText}>
              示例：apple
            </ThemedText>

            <ThemedText variant="body" color={theme.textSecondary} style={[styles.infoSubtitle, styles.marginTop]}>
              CSV 格式：
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.infoText}>
              列：word, phonetic, definition, split, mnemonic, example
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.infoText}>
              示例：apple, /ˈæpl/, 苹果, a-pp-le, 阿婆拿着苹果跑了, I eat an apple
            </ThemedText>
          </ThemedView>
        </View>
      </View>
    </Screen>
  );
}
