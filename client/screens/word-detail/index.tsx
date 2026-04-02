import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { getWordById, updateWord, deleteWord } from '@/database/wordDao';
import { getAllCodes } from '@/database/codeDao';
import { initDatabase } from '@/database';
import { Word, Code } from '@/database/types';
import {
  SplitItem,
  autoSplitByCodeLib,
  autoFillMeaning,
  validateSplitCompleteness,
  convertSplitItemsToString,
  parseSplitString,
  performSplit,
  getCodeSuggestion,
  CodeSuggestion
} from '@/utils/splitHelper';
import { fetchPhoneticByWord } from '@/utils';
import { useAI } from '@/hooks/useAI';
import { useNetwork } from '@/hooks/useNetwork';

// 词性列表
const PART_OF_SPEECH_LIST = [
  'n.名词', 'pron.代词', 'v.动词', 'adj.形容词', 'adv.副词',
  'prep.介词', 'conj.连词', 'int.感叹词', 'num.数词', 'art.冠词'
];

type EditMode = 'view' | 'edit';

export default function WordDetailScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();
  const { settings: aiSettings, generateMnemonic, generateAutoFill } = useAI();
  const { isConnected, checkNetwork, showNetworkError } = useNetwork();

  // 基础字段
  const [word, setWord] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [definition, setDefinition] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [sentence, setSentence] = useState('');
  const [example, setExample] = useState('');
  
  // 拆分相关
  const [splitItems, setSplitItems] = useState<SplitItem[]>([{ code: '', content: '' }]);
  const [splitHistory, setSplitHistory] = useState<SplitItem[][]>([]);
  const [codeSuggestions, setCodeSuggestions] = useState<Record<string, CodeSuggestion>>({});
  const [activeCodeIndex, setActiveCodeIndex] = useState(-1);
  
  // 编码库
  const [codes, setCodes] = useState<Code[]>([]);
  
  // UI 状态
  const [editMode, setEditMode] = useState<EditMode>('view');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalWord, setOriginalWord] = useState<Word | null>(null);
  const [autoCompleteEnabled, setAutoCompleteEnabled] = useState(true);
  
  // AI 生成状态
  const [generatingMnemonic, setGeneratingMnemonic] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);

  // 追踪已补全的编码（同一编码只补全最先填写的含义）
  const completedCodesRef = React.useRef<Set<string>>(new Set());

  // 助记自动补全功能
  useEffect(() => {
    if (!autoCompleteEnabled || !sentence.trim()) return;

    const validSplits = splitItems.filter(item => item.code && item.content);
    if (validSplits.length === 0) return;

    let newText = sentence;
    let hasChanges = false;

    const escapeRegex = (str: string) => {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    for (let splitIndex = 0; splitIndex < validSplits.length; splitIndex++) {
      const split = validSplits[splitIndex];
      const { code, content } = split;
      if (!code || !content) continue;

      // 检查该编码是否已经被补全过（同一编码只补全最先填写的含义）
      if (completedCodesRef.current.has(code.toLowerCase())) {
        continue; // 已补全，跳过该编码的所有含义
      }

      const meanings = content.split(/、/).map(m => m.trim()).filter(m => m);

      for (const meaning of meanings) {
        const patternWithBrackets = new RegExp(`${escapeRegex(meaning)}[\\(（]${escapeRegex(code)}[\\)）]`);
        if (patternWithBrackets.test(newText)) {
          continue;
        }

        if (newText.includes(meaning)) {
          newText = newText.replace(
            new RegExp(`${escapeRegex(meaning)}`, 'g'),
            `${meaning}（${code}）`
          );
          hasChanges = true;
          // 标记该编码为已补全
          completedCodesRef.current.add(code.toLowerCase());
          // 找到一个匹配就停止该编码的其他含义
          break;
        }
      }
    }

    if (hasChanges) {
      setAutoCompleteEnabled(false);
      setSentence(newText);
      setTimeout(() => setAutoCompleteEnabled(true), 100);
    }
  }, [sentence, splitItems]);

  // 处理助记句子输入（检测删除行为和输入内容）
  const handleSentenceChange = (text: string) => {
    // 检测删除行为：文本长度减少
    if (text.length < sentence.length) {
      // 检测到删除，关闭自动补全并重置已补全编码集合
      setAutoCompleteEnabled(false);
      completedCodesRef.current.clear(); // 清空已补全编码，允许重新补全
    } else if (text.length > sentence.length) {
      // 检测到输入，恢复自动补全
      setAutoCompleteEnabled(true);
    }
    
    setSentence(text);
  };

  // 加载单词数据
  useEffect(() => {
    loadWordDetail();
  }, [id]);

  const loadWordDetail = async () => {
    try {
      await initDatabase();
      
      // 加载编码库
      const allCodes = await getAllCodes();
      setCodes(allCodes);
      
      if (id) {
        const wordData = await getWordById(parseInt(id));
        if (wordData) {
          setOriginalWord(wordData);
          
          // 设置表单值
          setWord(wordData.word || '');
          setPhonetic(wordData.phonetic || '');
          setDefinition(wordData.definition || '');
          setPartOfSpeech(wordData.partOfSpeech || '');
          setSentence(wordData.mnemonic || '');
          setExample(wordData.sentence || '');
          
          // 解析拆分数据
          if (wordData.split) {
            const parsedSplits = parseSplitString(wordData.split);
            if (parsedSplits && parsedSplits.length > 0) {
              setSplitItems(parsedSplits);
            }
          }
        } else {
          Alert.alert('错误', '单词不存在');
          router.back();
        }
      }
    } catch (error) {
      console.error('加载单词详情失败:', error);
      Alert.alert('错误', '加载单词详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    // 自动识别并拆分单词
    if (word && word.trim()) {
      // 检查当前拆分是否完整
      const splitValidation = validateSplitCompleteness(splitItems, word);
      
      // 如果拆分不完整或者没有拆分数据，则自动拆分
      if (!splitValidation.valid || splitItems.length === 0 || (splitItems.length === 1 && splitItems[0].code === '')) {
        // 尝试自动拆分
        const autoSplitResult = autoSplitByCodeLib(word, codes);
        if (autoSplitResult && autoSplitResult.length > 0) {
          // 拆分成功，使用拆分结果
          setSplitItems(autoSplitResult);
        } else {
          // 拆分失败，使用单个项（编码框显示单词）
          const meaning = autoFillMeaning(word, codes);
          setSplitItems([{ code: word, content: meaning }]);
        }
        // 清空历史记录
        setSplitHistory([]);
      }
    }
    setEditMode('edit');
  };

  const handleCancelEdit = () => {
    // 恢复原始数据
    if (originalWord) {
      setWord(originalWord.word || '');
      setPhonetic(originalWord.phonetic || '');
      setDefinition(originalWord.definition || '');
      setPartOfSpeech(originalWord.partOfSpeech || '');
      setSentence(originalWord.mnemonic || '');
      setExample(originalWord.sentence || '');
      
      if (originalWord.split) {
        const parsedSplits = parseSplitString(originalWord.split);
        if (parsedSplits && parsedSplits.length > 0) {
          setSplitItems(parsedSplits);
        }
      }
      
      setSplitHistory([]);
      setAutoCompleteEnabled(true);
    }
    setEditMode('view');
  };

  // 处理单词输入
  const handleWordChange = async (text: string) => {
    const filteredText = text.replace(/[^a-z]/gi, '');
    if (text !== filteredText) {
      Alert.alert('提示', '仅允许输入英文字母');
    }
    setWord(filteredText);
    
    // 自动填充拆分
    if (filteredText.length > 0) {
      setSplitItems([{ code: filteredText, content: autoFillMeaning(filteredText, codes) }]);
    } else {
      setSplitItems([{ code: '', content: '' }]);
      setSplitHistory([]);
    }
  };

  // 处理单词失焦（触发自动拆分）
  const handleWordBlur = () => {
    if (!word) return;
    
    const autoSplitResult = autoSplitByCodeLib(word, codes);
    if (autoSplitResult && autoSplitResult.length > 0) {
      // 保存历史记录
      setSplitHistory(prev => [...prev, [...splitItems]]);
      setSplitItems(autoSplitResult);
    }
  };

  // 处理编码输入
  const handleCodeChange = (index: number, text: string) => {
    const newSplitItems = [...splitItems];
    newSplitItems[index].code = text;
    setSplitItems(newSplitItems);
    
    // 查找编码建议
    const suggestion = getCodeSuggestion(text, codes);
    if (suggestion) {
      setCodeSuggestions(prev => ({
        ...prev,
        [`code_${index}`]: suggestion
      }));
      
      // 如果完全匹配，自动填充含义
      if (text.toLowerCase() === suggestion.matchedCode.letter.toLowerCase()) {
        newSplitItems[index].content = suggestion.matchedCode.chinese;
        setSplitItems(newSplitItems);
      }
    } else {
      setCodeSuggestions(prev => {
        const newSuggestions = { ...prev };
        delete newSuggestions[`code_${index}`];
        return newSuggestions;
      });
    }
  };

  // 选择编码建议
  const handleSelectSuggestion = (index: number) => {
    const suggestion = codeSuggestions[`code_${index}`];
    if (!suggestion) return;

    const newSplitItems = [...splitItems];
    newSplitItems[index].code = suggestion.matchedCode.letter;
    newSplitItems[index].content = suggestion.matchedCode.chinese;
    setSplitItems(newSplitItems);
    
    setCodeSuggestions(prev => {
      const newSuggestions = { ...prev };
      delete newSuggestions[`code_${index}`];
      return newSuggestions;
    });
  };

  // 处理含义输入
  const handleContentChange = (index: number, text: string) => {
    const newSplitItems = [...splitItems];
    newSplitItems[index].content = text;
    setSplitItems(newSplitItems);
  };

  // 执行拆分
  const handlePerformSplit = (splitItemIndex: number, splitPoint: number) => {
    const splitItem = splitItems[splitItemIndex];
    if (!splitItem || !splitItem.code) {
      Alert.alert('提示', '请先输入单词');
      return;
    }

    const code = splitItem.code;
    // splitPoint 是分割点位置，必须在 1 到 code.length-1 之间
    if (splitPoint < 1 || splitPoint >= code.length) {
      Alert.alert('提示', '请在单词中间位置拆分');
      return;
    }

    // 保存历史记录
    setSplitHistory(prev => [...prev, [...splitItems]]);

    const result = performSplit(code, splitPoint, codes);
    if (result) {
      const [left, right] = result;
      const newSplitItems = [...splitItems];
      newSplitItems.splice(splitItemIndex, 1, left, right);
      setSplitItems(newSplitItems);
      setActiveCodeIndex(-1);
    }
  };

  // 撤销拆分
  const handleUndoSplit = () => {
    if (splitHistory.length === 0) {
      Alert.alert('提示', '没有可撤销的操作');
      return;
    }

    const lastHistory = splitHistory[splitHistory.length - 1];
    setSplitItems(lastHistory);
    setSplitHistory(prev => prev.slice(0, -1));
    setActiveCodeIndex(-1);
  };

  // AI 生成助记句
  const handleGenerateMnemonic = async () => {
    if (!word.trim()) {
      Alert.alert('提示', '请先输入单词');
      return;
    }
    
    // 检查网络状态
    const hasNetwork = await checkNetwork();
    if (!hasNetwork) {
      showNetworkError();
      return;
    }
    
    if (!aiSettings) {
      Alert.alert(
        'AI 未配置',
        '请先配置 AI 设置',
        [
          { text: '取消', style: 'cancel' },
          { text: '去设置', onPress: () => router.push('/ai-settings') }
        ]
      );
      return;
    }
    
    setGeneratingMnemonic(true);
    try {
      // 将 splitItems 转换为字符串格式
      const splitText = convertSplitItemsToString(splitItems);
      
      const result = await generateMnemonic(
        word.trim(),
        definition.trim() || undefined,
        splitText || undefined,
        phonetic.trim() || undefined
      );
      if (result) {
        setSentence(result);
        Alert.alert('成功', '助记句已生成');
      }
    } catch (error) {
      console.error('生成助记句失败:', error);
      Alert.alert('错误', '生成助记句失败，请检查网络连接和 API 配置');
    } finally {
      setGeneratingMnemonic(false);
    }
  };
  
  // 一键 AI 填充所有字段
  const handleAutoFill = async () => {
    if (!word.trim()) {
      Alert.alert('提示', '请先输入单词');
      return;
    }
    
    // 检查网络状态
    const hasNetwork = await checkNetwork();
    if (!hasNetwork) {
      showNetworkError();
      return;
    }
    
    if (!aiSettings) {
      Alert.alert(
        'AI 未配置',
        '请先配置 AI 设置',
        [
          { text: '取消', style: 'cancel' },
          { text: '去设置', onPress: () => router.push('/ai-settings') }
        ]
      );
      return;
    }
    
    setAutoFilling(true);
    try {
      const result = await generateAutoFill(word.trim(), {
        phonetic: phonetic.trim() || undefined,
        definition: definition.trim() || undefined,
        split: convertSplitItemsToString(splitItems) || undefined,
        mnemonic: sentence.trim() || undefined,
      });
      
      if (result) {
        // 填充所有字段
        if (result.phonetic) setPhonetic(result.phonetic);
        if (result.definition) {
          // 尝试从释义中提取词性
          const posMatch = result.definition.match(/^([a-z]+\.)\s*/i);
          if (posMatch) {
            const pos = PART_OF_SPEECH_LIST.find(p => p.startsWith(posMatch[1]));
            if (pos) {
              setPartOfSpeech(pos);
              setDefinition(result.definition.replace(posMatch[0], ''));
            } else {
              setDefinition(result.definition);
            }
          } else {
            setDefinition(result.definition);
          }
        }
        if (result.split) {
          const parsedSplits = parseSplitString(result.split);
          if (parsedSplits && parsedSplits.length > 0) {
            setSplitItems(parsedSplits);
          }
        }
        if (result.mnemonic) setSentence(result.mnemonic);
        
        Alert.alert('成功', 'AI 已填充所有字段，请检查并保存');
      }
    } catch (error) {
      console.error('一键填充失败:', error);
      Alert.alert('错误', '一键填充失败，请检查网络连接和 API 配置');
    } finally {
      setAutoFilling(false);
    }
  };
  
  // 表单验证
  const validateForm = (): boolean => {
    if (!word.trim()) {
      Alert.alert('提示', '请输入单词');
      return false;
    }
    if (!definition.trim()) {
      Alert.alert('提示', '请输入释义');
      return false;
    }
    if (!partOfSpeech) {
      Alert.alert('提示', '请选择词性');
      return false;
    }

    // 验证拆分
    const splitValidation = validateSplitCompleteness(splitItems, word);
    if (!splitValidation.valid) {
      Alert.alert('提示', splitValidation.message);
      return false;
    }

    return true;
  };

  // 保存单词
  const handleSave = async () => {
    if (!originalWord) return;
    
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      const splitText = convertSplitItemsToString(splitItems);
      
      const updateData = {
        word: word.trim(),
        phonetic: phonetic.trim() || undefined,
        definition: definition.trim(),
        partOfSpeech: partOfSpeech,
        split: splitText || undefined,
        mnemonic: sentence.trim() || undefined,
        sentence: example.trim() || undefined,
      };

      await updateWord(originalWord.id, updateData);
      
      // 重新加载数据
      await loadWordDetail();
      
      setEditMode('view');
      Alert.alert('成功', '单词已更新');
    } catch (error) {
      console.error('更新失败:', error);
      Alert.alert('错误', '更新失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!originalWord) return;

    Alert.alert(
      '确认删除',
      '确定要删除这个单词吗？此操作不可撤销。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWord(originalWord.id);
              Alert.alert('成功', '单词已删除', [
                { text: '确定', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('删除单词失败:', error);
              Alert.alert('错误', '删除失败，请重试');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.loadingContainer}>
          <ThemedText color={theme.textMuted}>加载中...</ThemedText>
        </View>
      </Screen>
    );
  }

  if (editMode === 'edit') {
    // 编辑模式 - 单词基本信息使用信息卡片展示（不可编辑）
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 顶部操作栏 */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleCancelEdit}>
              <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText variant="h4" color={theme.textPrimary}>编辑单词</ThemedText>
            <TouchableOpacity style={styles.backButton} onPress={handleSave}>
              <FontAwesome6 name="check" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* 单词信息卡片区域 - 不可编辑 */}
          <View style={styles.infoCardSection}>
            {/* 单词卡片 */}
            <ThemedView level="default" style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoCardTitleRow}>
                  <FontAwesome6 name="spell-check" size={16} color={theme.primary} />
                  <ThemedText variant="body" color={theme.textSecondary}>单词</ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.aiCardButton}
                  onPress={handleAutoFill}
                  disabled={autoFilling}
                >
                  {autoFilling ? (
                    <ActivityIndicator size="small" color={theme.buttonPrimaryText} />
                  ) : (
                    <>
                      <FontAwesome6 name="wand-magic-sparkles" size={12} color={theme.buttonPrimaryText} />
                      <ThemedText variant="caption" color={theme.buttonPrimaryText}>一键AI填充</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <ThemedText variant="h2" color={theme.textPrimary} style={styles.infoCardValue}>
                {word || '—'}
              </ThemedText>
            </ThemedView>

            {/* 音标卡片 */}
            <ThemedView level="default" style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoCardTitleRow}>
                  <FontAwesome6 name="music" size={16} color={theme.primary} />
                  <ThemedText variant="body" color={theme.textSecondary}>音标</ThemedText>
                </View>
              </View>
              <ThemedText variant="h4" color={theme.textPrimary} style={styles.infoCardValue}>
                {phonetic || '—'}
              </ThemedText>
            </ThemedView>

            {/* 释义卡片 */}
            <ThemedView level="default" style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoCardTitleRow}>
                  <FontAwesome6 name="book" size={16} color={theme.primary} />
                  <ThemedText variant="body" color={theme.textSecondary}>释义</ThemedText>
                </View>
              </View>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.infoCardValue}>
                {definition || '—'}
              </ThemedText>
              {partOfSpeech && (
                <View style={styles.partOfSpeechTag}>
                  <ThemedText variant="caption" color={theme.buttonPrimaryText}>
                    {partOfSpeech}
                  </ThemedText>
                </View>
              )}
            </ThemedView>
          </View>

          {/* 拆分 */}
          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <View style={styles.splitLabelContainer}>
                <ThemedText variant="body" color={theme.textPrimary} style={styles.label}>
                  拆分
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>
                  点击字母开始拆分
                </ThemedText>
              </View>
              {splitHistory.length > 0 && (
                <TouchableOpacity onPress={handleUndoSplit} style={styles.undoButton}>
                  <FontAwesome6 name="rotate-left" size={16} color={theme.accent} />
                  <ThemedText variant="caption" color={theme.accent} style={styles.undoText}>
                    撤销
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
            {splitItems.map((item, index) => (
              <View key={index} style={styles.splitItemContainer}>
                <View style={styles.splitCodeRow}>
                  <TextInput
                    style={styles.splitCodeInput}
                    value={item.code}
                    onChangeText={text => handleCodeChange(index, text)}
                    onFocus={() => setActiveCodeIndex(index)}
                    onBlur={() => setActiveCodeIndex(-1)}
                    placeholder="编码"
                    placeholderTextColor={theme.textMuted}
                  />
                  <ThemedText variant="body" color={theme.textMuted}>-</ThemedText>
                  <TextInput
                    style={styles.splitContentInput}
                    value={item.content}
                    onChangeText={text => handleContentChange(index, text)}
                    placeholder="含义"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                {/* 编码建议 */}
                {codeSuggestions[`code_${index}`] && activeCodeIndex === index && (
                  <TouchableOpacity
                    onPress={() => handleSelectSuggestion(index)}
                    style={styles.codeSuggestion}
                  >
                    <ThemedText variant="body" color={theme.textPrimary}>
                      {codeSuggestions[`code_${index}`].userInput}
                    </ThemedText>
                    <ThemedText variant="body" color={theme.primary}>
                      {codeSuggestions[`code_${index}`].completedText}
                    </ThemedText>
                  </TouchableOpacity>
                )}

                {/* 字符拆分按钮 */}
                {item.code && (
                  <View style={styles.splitCharsContainer}>
                    {item.code.split('').map((char, charIndex) => (
                      <TouchableOpacity
                        key={charIndex}
                        onPress={() => handlePerformSplit(index, charIndex + 1)}
                        style={styles.splitCharButton}
                      >
                        <ThemedText variant="h3" color={theme.textPrimary}>
                          {char}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* 助记句子 */}
          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <View style={styles.labelRowLeft}>
                <ThemedText variant="body" color={theme.textPrimary} style={styles.label}>
                  助记句子
                </ThemedText>
                <TouchableOpacity
                  style={styles.aiButton}
                  onPress={handleGenerateMnemonic}
                  disabled={generatingMnemonic || !word.trim()}
                >
                  {generatingMnemonic ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <>
                      <FontAwesome6 name="wand-magic-sparkles" size={14} color={theme.primary} />
                      <ThemedText variant="caption" color={theme.primary} style={styles.aiButtonText}>
                        AI 生成
                      </ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setAutoCompleteEnabled(!autoCompleteEnabled)}
                style={styles.autoCompleteToggle}
              >
                <FontAwesome6
                  name={autoCompleteEnabled ? "toggle-on" : "toggle-off"}
                  size={24}
                  color={autoCompleteEnabled ? theme.primary : theme.textMuted}
                />
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.autoCompleteLabel}>
                  自动补全
                </ThemedText>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={sentence}
              onChangeText={handleSentenceChange}
              placeholder="例：王（w）阿姨（ay）教我方法"
              placeholderTextColor={theme.textMuted}
              multiline
            />
          </View>

          {/* 例句 */}
          <View style={styles.inputContainer}>
            <ThemedText variant="body" color={theme.textPrimary} style={styles.label}>
              例句
            </ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={example}
              onChangeText={setExample}
              placeholder="请输入例句"
              placeholderTextColor={theme.textMuted}
              multiline
            />
          </View>

          {/* 保存按钮 */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <ThemedText variant="body" color={theme.buttonPrimaryText}>
              {saving ? '保存中...' : '保存'}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </Screen>
    );
  }

  // 查看模式
  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 顶部操作栏 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.backButton} onPress={handleEdit}>
              <FontAwesome6 name="pen" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={handleDelete}>
              <FontAwesome6 name="trash" size={20} color={theme.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 单词展示 */}
        <View style={styles.wordContainer}>
          <ThemedText variant="h1" color={theme.textPrimary}>{word}</ThemedText>
          {phonetic && (
            <ThemedText variant="h4" color={theme.textMuted} style={styles.phonetic}>
              {phonetic}
            </ThemedText>
          )}
        </View>

        {/* 释义卡片 */}
        <ThemedView level="default" style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome6 name="book" size={18} color={theme.primary} />
            <ThemedText variant="h4" color={theme.textPrimary}>释义</ThemedText>
          </View>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.definitionText}>
            {definition}
          </ThemedText>
          {partOfSpeech && (
            <View style={styles.partOfSpeechTag}>
              <ThemedText variant="caption" color={theme.buttonPrimaryText}>
                {partOfSpeech}
              </ThemedText>
            </View>
          )}
        </ThemedView>

        {/* 拆分卡片 */}
        {splitItems.some(item => item.code && item.content) && (
          <ThemedView level="default" style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome6 name="puzzle-piece" size={18} color={theme.primary} />
              <ThemedText variant="h4" color={theme.textPrimary}>拆分</ThemedText>
            </View>
            {splitItems
              .filter(item => item.code && item.content)
              .map((item, index) => (
                <View key={index} style={styles.splitItemView}>
                  <ThemedText variant="body" color={theme.primary} style={styles.splitCode}>
                    {item.code}
                  </ThemedText>
                  <ThemedText variant="body" color={theme.textSecondary} style={styles.splitContent}>
                    {item.content}
                  </ThemedText>
                </View>
              ))}
          </ThemedView>
        )}

        {/* 助记句子卡片 */}
        {sentence && (
          <ThemedView level="default" style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome6 name="lightbulb" size={18} color={theme.primary} />
              <ThemedText variant="h4" color={theme.textPrimary}>助记句子</ThemedText>
            </View>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.definitionText}>
              {sentence}
            </ThemedText>
          </ThemedView>
        )}

        {/* 例句卡片 */}
        {example && (
          <ThemedView level="default" style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome6 name="quote-left" size={18} color={theme.primary} />
              <ThemedText variant="h4" color={theme.textPrimary}>例句</ThemedText>
            </View>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.definitionText}>
              {example}
            </ThemedText>
          </ThemedView>
        )}
      </ScrollView>
    </Screen>
  );
}
