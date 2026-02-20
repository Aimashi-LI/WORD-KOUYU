import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { initDatabase } from '@/database';
import { batchInsertPhonetics, getAllPhonetics, deletePhonetic, Phonetic } from '@/database/phoneticDao';
import { upsertPhonetic } from '@/utils';

export default function PhoneticsScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  
  const [loading, setLoading] = useState(false);
  const [phonetics, setPhonetics] = useState<Phonetic[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  const loadPhonetics = async () => {
    try {
      await initDatabase();
      const allPhonetics = await getAllPhonetics();
      setPhonetics(allPhonetics);
    } catch (error) {
      console.error('加载音标失败:', error);
      Alert.alert('错误', '加载音标失败');
    }
  };

  React.useEffect(() => {
    loadPhonetics();
  }, []);

  const handleAdd = async () => {
    if (!newWord.trim() || !newPhonetic.trim()) {
      Alert.alert('提示', '请输入单词和音标');
      return;
    }

    try {
      await initDatabase();
      await upsertPhonetic(newWord.trim(), newPhonetic.trim());
      setNewWord('');
      setNewPhonetic('');
      setShowAddModal(false);
      await loadPhonetics();
      Alert.alert('成功', '音标添加成功');
    } catch (error) {
      console.error('添加音标失败:', error);
      Alert.alert('错误', '添加音标失败');
    }
  };

  const handleDelete = async (word: string) => {
    Alert.alert(
      '确认删除',
      `确定要删除 "${word}" 的音标吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await initDatabase();
              await deletePhonetic(word);
              await loadPhonetics();
              Alert.alert('成功', '音标删除成功');
            } catch (error) {
              console.error('删除音标失败:', error);
              Alert.alert('错误', '删除音标失败');
            }
          }
        }
      ]
    );
  };

  const handleImport = async () => {
    if (!importText.trim()) {
      Alert.alert('提示', '请输入导入内容');
      return;
    }

    setLoading(true);
    try {
      await initDatabase();
      
      const lines = importText.split('\n').filter(line => line.trim());
      const phoneticsData: { word: string; phonetic: string }[] = [];
      
      for (const line of lines) {
        // 支持格式：word phonetic 或 word,phonetic
        const parts = line.split(/[,\s]+/).filter(p => p.trim());
        if (parts.length >= 2) {
          phoneticsData.push({
            word: parts[0].trim().toLowerCase(),
            phonetic: parts[1].trim()
          });
        }
      }

      if (phoneticsData.length === 0) {
        Alert.alert('提示', '未找到有效的音标数据');
        setLoading(false);
        return;
      }

      await batchInsertPhonetics(phoneticsData);
      setImportText('');
      setShowImportModal(false);
      await loadPhonetics();
      Alert.alert('成功', `成功导入 ${phoneticsData.length} 个音标`);
    } catch (error) {
      console.error('导入音标失败:', error);
      Alert.alert('错误', '导入音标失败');
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
          <ThemedText variant="h2" color={theme.textPrimary}>音标管理</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* 操作按钮 */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowAddModal(true)}
          >
            <FontAwesome6 name="plus" size={20} color={theme.buttonPrimaryText} />
            <ThemedText variant="body" color={theme.buttonPrimaryText}>添加音标</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowImportModal(true)}
          >
            <FontAwesome6 name="file-import" size={20} color={theme.buttonPrimaryText} />
            <ThemedText variant="body" color={theme.buttonPrimaryText}>批量导入</ThemedText>
          </TouchableOpacity>
        </View>

        {/* 音标列表 */}
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {phonetics.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="volume-high" size={48} color={theme.textMuted} />
              <ThemedText variant="body" color={theme.textMuted} style={styles.emptyText}>
                暂无音标数据
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.emptyHint}>
                点击上方按钮添加音标
              </ThemedText>
            </View>
          ) : (
            phonetics.map((item) => (
              <ThemedView key={item.id} level="default" style={styles.phoneticItem}>
                <View style={styles.phoneticInfo}>
                  <ThemedText variant="h3" color={theme.textPrimary}>{item.word}</ThemedText>
                  <ThemedText variant="body" color={theme.textSecondary}>{item.phonetic}</ThemedText>
                </View>
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item.word)}
                >
                  <FontAwesome6 name="trash" size={16} color={theme.error} />
                </TouchableOpacity>
              </ThemedView>
            ))
          )}
        </ScrollView>
      </View>

      {/* 添加音标 Modal */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText variant="h3" color={theme.textPrimary}>添加音标</ThemedText>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <FontAwesome6 name="xmark" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="单词"
              placeholderTextColor={theme.textMuted}
              value={newWord}
              onChangeText={setNewWord}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="音标（如：/ˈhɛloʊ/）"
              placeholderTextColor={theme.textMuted}
              value={newPhonetic}
              onChangeText={setNewPhonetic}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <ThemedText variant="body" color={theme.textSecondary}>取消</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleAdd}
              >
                <ThemedText variant="body" color={theme.buttonPrimaryText}>确认</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* 批量导入 Modal */}
      {showImportModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText variant="h3" color={theme.textPrimary}>批量导入</ThemedText>
              <TouchableOpacity onPress={() => setShowImportModal(false)}>
                <FontAwesome6 name="xmark" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <ThemedText variant="caption" color={theme.textSecondary} style={styles.importHint}>
              格式：单词 音标（每行一个，用空格或逗号分隔）
            </ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="hello /həˈloʊ/\nworld /wɜːrld/\ntest /tɛst/"
              placeholderTextColor={theme.textMuted}
              value={importText}
              onChangeText={setImportText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            {loading ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowImportModal(false)}
                >
                  <ThemedText variant="body" color={theme.textSecondary}>取消</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={handleImport}
                >
                  <ThemedText variant="body" color={theme.buttonPrimaryText}>导入</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}
