import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/theme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';
import {
  getAllCodes,
  updateCode,
  deleteCode,
  addCode,
  initDefaultCodes,
  resetCodes
} from '@/database/codeDao';
import { initDatabase } from '@/database';
import { Code } from '@/database/types';

// 编码组组件
interface CodeGroupProps {
  letter: string;
  codes: Code[];
  selectedIds: Set<number>;
  onToggleSelection: (id: number) => void;
  onEdit: (code: Code) => void;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
}

function CodeGroup({ letter, codes, selectedIds, onToggleSelection, onEdit, theme, styles }: CodeGroupProps) {
  return (
    <View style={styles.groupContainer}>
      <ThemedView level="tertiary" style={styles.groupHeader}>
        <ThemedText variant="h2" style={{ color: theme.primary }}>{letter.toUpperCase()}</ThemedText>
      </ThemedView>
      {codes.map(code => (
        <TouchableOpacity
          key={code.id}
          style={[
            styles.codeItem,
            selectedIds.has(code.id) && { backgroundColor: theme.backgroundTertiary }
          ]}
          onLongPress={() => onToggleSelection(code.id)}
          delayLongPress={500}
        >
          <TouchableOpacity
            style={[
              styles.selectBox,
              selectedIds.has(code.id) && styles.selectBoxSelected
            ]}
            onPress={() => onToggleSelection(code.id)}
          >
            {selectedIds.has(code.id) && (
              <FontAwesome6 name="check" size={12} color={theme.buttonPrimaryText} />
            )}
          </TouchableOpacity>
          <View style={styles.codeContent}>
            <ThemedText variant="h3" style={styles.letter}>{code.letter}</ThemedText>
            <ThemedText variant="body" style={{ color: theme.textSecondary }}>{code.chinese}</ThemedText>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEdit(code)}
          >
            <FontAwesome6 name="pencil" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function CodebaseScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [codes, setCodes] = useState<Code[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<Code[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  
  // 编辑状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCode, setEditingCode] = useState<Code | null>(null);
  const [newCodeLetter, setNewCodeLetter] = useState('');
  const [newCodeChinese, setNewCodeChinese] = useState('');
  
  // 选择状态
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await initDatabase();
      await initDefaultCodes();
      const allCodes = await getAllCodes();
      setCodes(allCodes);
      setFilteredCodes(allCodes);
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text.trim() === '') {
      setFilteredCodes(codes);
    } else {
      const filtered = codes.filter(code => 
        code.letter.toLowerCase().includes(text.toLowerCase()) ||
        code.chinese.includes(text)
      );
      setFilteredCodes(filtered);
    }
  };

  // 选择编码
  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;

    Alert.alert(
      '确认删除',
      `确定要删除选中的 ${selectedIds.size} 个编码吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const id of selectedIds) {
                await deleteCode(id);
              }
              setSelectedIds(new Set());
              await loadData();
              Alert.alert('成功', '删除成功');
            } catch (error) {
              console.error('删除失败:', error);
              Alert.alert('错误', '删除失败');
            }
          }
        }
      ]
    );
  };

  // 编辑编码
  const handleEdit = (code: Code) => {
    setEditingCode(code);
    setShowEditModal(true);
  };

  // 重置编码库
  const handleResetCodes = async () => {
    Alert.alert(
      '确认重置',
      '此操作将删除所有现有编码并重新加载默认编码库，确定继续吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '重置',
          style: 'destructive',
          onPress: async () => {
            try {
              const count = await resetCodes();
              await loadData();
              Alert.alert('成功', `已重置编码库，共加载 ${count} 个编码`);
            } catch (error) {
              console.error('重置失败:', error);
              Alert.alert('错误', '重置失败');
            }
          }
        }
      ]
    );
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingCode || !editingCode.letter || !editingCode.chinese) {
      Alert.alert('提示', '请填写完整的编码和含义');
      return;
    }

    try {
      await updateCode(editingCode.id, editingCode.letter, editingCode.chinese);
      setShowEditModal(false);
      setEditingCode(null);
      await loadData();
      Alert.alert('成功', '修改成功');
    } catch (error) {
      console.error('保存失败:', error);
      Alert.alert('错误', '保存失败');
    }
  };

  // 添加编码
  const handleAddCode = async () => {
    if (!newCodeLetter || !newCodeChinese) {
      Alert.alert('提示', '请填写完整的编码和含义');
      return;
    }

    try {
      await addCode(newCodeLetter, newCodeChinese);
      setShowAddModal(false);
      setNewCodeLetter('');
      setNewCodeChinese('');
      await loadData();
      Alert.alert('成功', '添加成功');
    } catch (error) {
      console.error('添加失败:', error);
      Alert.alert('错误', '添加失败');
    }
  };

  // 按字母分组
  const groupedCodes = useMemo(() => {
    const groups: Record<string, Code[]> = {};
    filteredCodes.forEach(code => {
      const firstLetter = code.letter.charAt(0).toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(code);
    });
    return groups;
  }, [filteredCodes]);

  if (loading) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.loadingContainer}>
          <ThemedText color={theme.textMuted}>加载中...</ThemedText>
        </View>
      </Screen>
    );
  }

  const groupList = Object.entries(groupedCodes);

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* 搜索栏 */}
        <ThemedView level="tertiary" style={styles.searchContainer}>
          <FontAwesome6 name="magnifying-glass" size={18} color={theme.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索字母或汉字"
            placeholderTextColor={theme.textMuted}
            value={searchText}
            onChangeText={handleSearch}
          />
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetCodes}
          >
            <FontAwesome6 name="rotate-right" size={18} color={theme.primary} />
          </TouchableOpacity>
        </ThemedView>

        {/* 操作栏 */}
        {selectedIds.size > 0 && (
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.actionCancelButton}
              onPress={() => setSelectedIds(new Set())}
            >
              <ThemedText variant="body" color={theme.buttonPrimaryText}>取消</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionDeleteButton}
              onPress={handleBatchDelete}
            >
              <FontAwesome6 name="trash" size={16} color={theme.buttonPrimaryText} />
              <ThemedText variant="body" color={theme.buttonPrimaryText}>
                删除 ({selectedIds.size})
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* 编码列表 */}
        {groupList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText color={theme.textMuted}>没有找到匹配的编码</ThemedText>
          </View>
        ) : (
          <FlatList
            data={groupList}
            keyExtractor={([letter]) => letter}
            renderItem={({ item }) => (
              <CodeGroup
                letter={item[0]}
                codes={item[1]}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
                onEdit={handleEdit}
                theme={theme}
                styles={styles}
              />
            )}
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* 添加按钮 */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <FontAwesome6 name="plus" size={28} color={theme.buttonPrimaryText} />
        </TouchableOpacity>
      </View>

      {/* 编辑弹窗 */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ThemedText variant="h2" style={styles.modalTitle}>
                编辑编码
              </ThemedText>

              <ThemedView level="tertiary" style={styles.inputContainer}>
                <ThemedText variant="body" style={styles.label}>
                  编码字母
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="输入编码字母"
                  placeholderTextColor={theme.textMuted}
                  value={editingCode?.letter}
                  onChangeText={(text) => setEditingCode(prev => prev ? { ...prev, letter: text } : null)}
                />
              </ThemedView>

              <ThemedView level="tertiary" style={styles.inputContainer}>
                <ThemedText variant="body" style={styles.label}>
                  中文含义
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="输入中文含义"
                  placeholderTextColor={theme.textMuted}
                  value={editingCode?.chinese}
                  onChangeText={(text) => setEditingCode(prev => prev ? { ...prev, chinese: text } : null)}
                />
              </ThemedView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowEditModal(false);
                    setEditingCode(null);
                  }}
                >
                  <ThemedText variant="body" style={{ color: '#6b7280' }}>取消</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleSaveEdit}
                >
                  <ThemedText variant="body" style={{ color: '#fff' }}>保存</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 添加弹窗 */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ThemedText variant="h2" style={styles.modalTitle}>
                添加编码
              </ThemedText>

              <ThemedView level="tertiary" style={styles.inputContainer}>
                <ThemedText variant="body" style={styles.label}>
                  编码字母
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="输入编码字母"
                  placeholderTextColor={theme.textMuted}
                  value={newCodeLetter}
                  onChangeText={setNewCodeLetter}
                />
              </ThemedView>

              <ThemedView level="tertiary" style={styles.inputContainer}>
                <ThemedText variant="body" style={styles.label}>
                  中文含义
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="输入中文含义"
                  placeholderTextColor={theme.textMuted}
                  value={newCodeChinese}
                  onChangeText={setNewCodeChinese}
                />
              </ThemedView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowAddModal(false);
                    setNewCodeLetter('');
                    setNewCodeChinese('');
                  }}
                >
                  <ThemedText variant="body" style={{ color: '#6b7280' }}>取消</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleAddCode}
                >
                  <ThemedText variant="body" style={{ color: '#fff' }}>添加</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
