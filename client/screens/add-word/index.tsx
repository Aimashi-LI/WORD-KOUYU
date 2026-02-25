import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { EnglishInput, ChineseInput, AutoInput } from '@/components/SmartTextInput';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { createWord, getWordByText, getWordById } from '@/database/wordDao';
import { addWordToWordbook } from '@/database/wordbookDao';
import { getAllCodes, addCode } from '@/database/codeDao';
import { initDatabase } from '@/database';
import { NewWord, Code } from '@/database/types';
import {
  SplitItem,
  autoSplitByCodeLib,
  autoFillMeaning,
  performSplit,
  validateSplitCompleteness,
  convertSplitItemsToString,
  parseSplitString,
  getCodeSuggestion,
  CodeSuggestion
} from '@/utils/splitHelper';
import { fetchPhoneticByWord } from '@/utils';
import { PhoneticKeyboard } from '@/components/PhoneticKeyboard';

  // 词性列表
const PART_OF_SPEECH_LIST = [
  'n.名词', 'pron.代词', 'v.动词', 'adj.形容词', 'adv.副词',
  'prep.介词', 'conj.连词', 'int.感叹词', 'num.数词', 'art.冠词'
];

// 词性映射：将识别到的词性格式转换为列表中的格式
const PART_OF_SPEECH_MAP: Record<string, string> = {
  '名词': 'n.名词',
  'n.名词': 'n.名词',
  'n.': 'n.名词',
  'n': 'n.名词',
  '代词': 'pron.代词',
  'pron.代词': 'pron.代词',
  'pron.': 'pron.代词',
  'pron': 'pron.代词',
  '动词': 'v.动词',
  'v.动词': 'v.动词',
  'v.': 'v.动词',
  'v': 'v.动词',
  '形容词': 'adj.形容词',
  'adj.形容词': 'adj.形容词',
  'adj.': 'adj.形容词',
  'adj': 'adj.形容词',
  '副词': 'adv.副词',
  'adv.副词': 'adv.副词',
  'adv.': 'adv.副词',
  'adv': 'adv.副词',
  '介词': 'prep.介词',
  'prep.介词': 'prep.介词',
  'prep.': 'prep.介词',
  'prep': 'prep.介词',
  '连词': 'conj.连词',
  'conj.连词': 'conj.连词',
  'conj.': 'conj.连词',
  'conj': 'conj.连词',
  '感叹词': 'int.感叹词',
  'int.感叹词': 'int.感叹词',
  'int.': 'int.感叹词',
  'int': 'int.感叹词',
  '数词': 'num.数词',
  'num.数词': 'num.数词',
  'num.': 'num.数词',
  'num': 'num.数词',
  '冠词': 'art.冠词',
  'art.冠词': 'art.冠词',
  'art.': 'art.冠词',
  'art': 'art.冠词',
};

export default function AddWordScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { wordbookId, word: initialWord, phonetic: initialPhonetic, partOfSpeech: initialPartOfSpeech, definition: initialDefinition } = useSafeSearchParams<{
    wordbookId?: string;
    word?: string;
    phonetic?: string;
    partOfSpeech?: string;
    definition?: string;
  }>();
  
  // 基础字段
  const [word, setWord] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [definition, setDefinition] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [sentence, setSentence] = useState('');
  const [example, setExample] = useState('');
  
  // 音标键盘
  const [showPhoneticKeyboard, setShowPhoneticKeyboard] = useState(false);
  
  // 追踪已补全的编码（同一编码只补全最先填写的含义）
  const completedCodesRef = React.useRef<Set<string>>(new Set());
  
  // 初始化：如果从拍照识别页面传入单词，自动填充
  useEffect(() => {
    if (initialWord && initialWord.trim()) {
      const wordText = initialWord.trim().replace(/[^a-z]/gi, '');
      if (wordText) {
        setWord(wordText);

        // 如果识别结果中包含音标，使用识别到的音标；否则自动获取
        if (initialPhonetic && initialPhonetic.trim()) {
          setPhonetic(initialPhonetic.trim());
        } else {
          fetchPhoneticByWord(wordText).then(phoneticText => {
            if (phoneticText) {
              setPhonetic(phoneticText);
            }
          });
        }

        // 如果识别结果中包含词性，使用识别到的词性，并进行模糊匹配
        if (initialPartOfSpeech && initialPartOfSpeech.trim()) {
          const posInput = initialPartOfSpeech.trim();
          // 尝试精确匹配
          const exactMatch = PART_OF_SPEECH_LIST.find(pos => pos === posInput);
          // 尝试模糊匹配
          const fuzzyMatch = PART_OF_SPEECH_MAP[posInput];

          const matchedPos = exactMatch || fuzzyMatch;
          if (matchedPos) {
            console.log('[词性自动匹配] 识别词性:', posInput, '匹配结果:', matchedPos);
            setPartOfSpeech(matchedPos);
          } else {
            console.log('[词性自动匹配] 识别词性:', posInput, '未匹配到词性');
          }
        }

        // 如果识别结果中包含释义，使用识别到的释义
        if (initialDefinition && initialDefinition.trim()) {
          setDefinition(initialDefinition.trim());
        }

        // 自动填充拆分（使用异步函数确保编码库已加载）
        const performAutoSplit = async () => {
          try {
            await initDatabase();
            const allCodes = await getAllCodes();
            console.log('[自动拆分] 编码库已加载，共', allCodes.length, '条编码');

            // 使用 autoSplitByCodeLib 进行自动拆分
            const splitResult = autoSplitByCodeLib(wordText, allCodes);
            if (splitResult && splitResult.length > 0) {
              console.log('[自动拆分] 拆分成功:', splitResult);
              setSplitItems(splitResult);
            } else {
              // 如果无法拆分，使用单个项
              const meaning = autoFillMeaning(wordText, allCodes);
              console.log('[自动拆分] 无法拆分，使用单个项:', meaning);
              setSplitItems([{ code: wordText, content: meaning }]);
            }
          } catch (error) {
            console.error('[自动拆分] 失败:', error);
            // 出错时使用单个项
            setSplitItems([{ code: wordText, content: '' }]);
          }
        };

        performAutoSplit();
      }
    }
  }, [initialWord, initialPhonetic, initialPartOfSpeech, initialDefinition]);
  
  // 拆分相关
  const [splitItems, setSplitItems] = useState<SplitItem[]>([{ code: '', content: '' }]);
  const [splitHistory, setSplitHistory] = useState<SplitItem[][]>([]);
  const [codeSuggestions, setCodeSuggestions] = useState<Record<string, CodeSuggestion>>({});
  const [activeCodeIndex, setActiveCodeIndex] = useState(-1);
  
  // 编码库
  const [codes, setCodes] = useState<Code[]>([]);
  
  // UI 状态
  const [loading, setLoading] = useState(false);
  const [autoCompleteEnabled, setAutoCompleteEnabled] = useState(true); // 控制自动补全的开关

  // 助记自动补全功能
  useEffect(() => {
    // 如果自动补全被禁用或文本为空，跳过
    if (!autoCompleteEnabled || !sentence.trim()) return;

    // 获取有中文内容的拆分项
    const validSplits = splitItems.filter(item => item.code && item.content);
    if (validSplits.length === 0) return;

    let newText = sentence;
    let hasChanges = false;

    // 转义正则特殊字符
    const escapeRegex = (str: string) => {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // 对每个拆分项进行检查
    for (let splitIndex = 0; splitIndex < validSplits.length; splitIndex++) {
      const split = validSplits[splitIndex];
      const { code, content } = split;
      if (!code || !content) continue;

      // 检查该编码是否已经被补全过（同一编码只补全最先填写的含义）
      if (completedCodesRef.current.has(code.toLowerCase())) {
        continue; // 已补全，跳过该编码的所有含义
      }

      // 将 content 拆分为多个含义（用顿号分隔）
      const meanings = content.split(/、/).map(m => m.trim()).filter(m => m);

      // 检查每个含义
      for (const meaning of meanings) {
        // 检查是否已经包含了"中文（字母）"或"中文(字母)"的形式
        const patternWithBrackets = new RegExp(`${escapeRegex(meaning)}[\\(（]${escapeRegex(code)}[\\)）]`);
        if (patternWithBrackets.test(newText)) {
          continue; // 已经有了括号补全，跳过这个含义
        }

        // 检查是否包含该含义（不限制边界，任何位置都可以补全）
        if (newText.includes(meaning)) {
          // 替换为"中文（字母）"形式（不限制边界，任何位置都可以补全）
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

    // 如果有变化，更新 sentence 并禁用自动补全（避免重复触发）
    if (hasChanges) {
      setAutoCompleteEnabled(false);
      setSentence(newText);
      // 短暂延迟后重新启用自动补全
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

  // 加载编码库
  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    try {
      await initDatabase();
      const allCodes = await getAllCodes();
      setCodes(allCodes);
    } catch (error) {
      console.error('加载编码库失败:', error);
    }
  };

  // 处理单词输入
  const handleWordChange = async (text: string) => {
    // 只允许字母
    const filteredText = text.replace(/[^a-z]/gi, '');
    if (text !== filteredText) {
      Alert.alert('提示', '仅允许输入英文字母');
    }
    setWord(filteredText);
    
    // 自动填充拆分
    if (filteredText.length > 0) {
      setSplitItems([{ code: filteredText, content: autoFillMeaning(filteredText, codes) }]);
      
      // 自动获取音标
      const phoneticText = await fetchPhoneticByWord(filteredText);
      if (phoneticText) {
        setPhonetic(phoneticText);
      }
    } else {
      setSplitItems([{ code: '', content: '' }]);
      setSplitHistory([]);
      setPhonetic('');
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
  const handleCodeInput = (index: number, text: string) => {
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
  const handlePerformSplit = (splitIndex: number, charIndex: number) => {
    const splitItem = splitItems[splitIndex];
    if (!splitItem || !splitItem.code) {
      Alert.alert('提示', '请先输入单词');
      return;
    }

    const code = splitItem.code;
    if (charIndex <= 0 || charIndex >= code.length) {
      Alert.alert('提示', '请在单词中间位置拆分');
      return;
    }

    // 保存历史记录
    setSplitHistory(prev => [...prev, [...splitItems]]);

    const result = performSplit(code, charIndex, codes);
    if (result) {
      const [left, right] = result;
      const newSplitItems = [...splitItems];
      newSplitItems.splice(splitIndex, 1, left, right);
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

  // 删除拆分项
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
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await initDatabase();
      
      // 检查单词是否已存在
      const existing = await getWordByText(word.trim());
      if (existing) {
        Alert.alert('提示', '该单词已存在');
        setLoading(false);
        return;
      }

      const splitText = convertSplitItemsToString(splitItems);
      
      const newWord: NewWord = {
        word: word.trim(),
        phonetic: phonetic.trim() || undefined,
        definition: definition.trim(),
        partOfSpeech: partOfSpeech,
        split: splitText || undefined,
        mnemonic: sentence.trim() || undefined, // 助记句子
        sentence: example.trim() || undefined, // 例句
      };

      console.log('[AddWord] 准备保存的单词数据:', JSON.stringify(newWord, null, 2));
      console.log('[AddWord] partOfSpeech 值:', partOfSpeech);
      console.log('[AddWord] partOfSpeech 类型:', typeof partOfSpeech);
      console.log('[AddWord] partOfSpeech 是否为空:', partOfSpeech === '' || partOfSpeech === null || partOfSpeech === undefined);
      console.log('[AddWord] 助记句子 (mnemonic):', newWord.mnemonic);
      console.log('[AddWord] 例句 (sentence):', newWord.sentence);

      const wordId = await createWord(newWord);
      console.log('[AddWord] 单词保存成功，ID:', wordId);

      // 立即查询验证例句是否保存成功
      const savedWord = await getWordById(wordId);
      console.log('[AddWord] 验证查询 - 保存后的单词数据:', JSON.stringify(savedWord, null, 2));
      console.log('[AddWord] 验证查询 - partOfSpeech 值:', savedWord?.partOfSpeech);
      console.log('[AddWord] 验证查询 - 助记句子 (mnemonic):', savedWord?.mnemonic);
      console.log('[AddWord] 验证查询 - 例句 (sentence):', savedWord?.sentence);
      console.log('[AddWord] 验证查询 - 例句是否正确:', savedWord?.sentence === newWord.sentence);
      
      // 如果有词库ID，将单词添加到词库
      if (wordbookId) {
        await addWordToWordbook(parseInt(wordbookId), wordId);
      }
      
      // 同步新编码到编码库
      await syncNewCodesToLib();
      
      Alert.alert('成功', '单词添加成功', [
        { text: '确定', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('添加失败:', error);
      Alert.alert('错误', '添加失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 同步新编码到编码库
  const syncNewCodesToLib = async () => {
    const codesToSync: { letter: string; chinese: string }[] = [];
    
    splitItems.forEach(item => {
      if (item.code && item.code.trim() !== '' && item.content && item.content.trim() !== '') {
        codesToSync.push({
          letter: item.code.trim(),
          chinese: item.content.trim()
        });
      }
    });

    if (codesToSync.length === 0) return;

    try {
      for (const codeItem of codesToSync) {
        await addCode(codeItem.letter, codeItem.chinese);
      }
    } catch (error) {
      console.error('同步编码失败:', error);
    }
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 标题栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h2" color={theme.textPrimary}>添加单词</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* 单词输入 */}
        <ThemedView level="tertiary" style={styles.inputContainer}>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.label}>
            单词 *
          </ThemedText>
          <EnglishInput
            style={styles.input}
            placeholder="输入单词"
            placeholderTextColor={theme.textMuted}
            value={word}
            onChangeText={handleWordChange}
            onBlur={handleWordBlur}
            autoCapitalize="none"
          />
        </ThemedView>

        {/* 音标输入 */}
        <ThemedView level="tertiary" style={styles.inputContainer}>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.label}>
            音标
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="点击输入音标"
            placeholderTextColor={theme.textMuted}
            value={phonetic}
            onChangeText={setPhonetic}
            onFocus={() => setShowPhoneticKeyboard(true)}
            onBlur={() => setShowPhoneticKeyboard(false)}
          />
        </ThemedView>

        {/* 词性选择 */}
        <ThemedView level="tertiary" style={styles.inputContainer}>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.label}>
            词性 *
          </ThemedText>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.posScroll}>
              {PART_OF_SPEECH_LIST.map((pos) => (
                <TouchableOpacity
                  key={pos}
                  style={[
                    styles.posButton,
                    partOfSpeech === pos && styles.posButtonActive
                  ]}
                  onPress={() => {
                    console.log('[词性选择] 选择了词性:', pos);
                    setPartOfSpeech(pos);
                  }}
                >
                  <ThemedText
                    variant="caption"
                    color={partOfSpeech === pos ? theme.buttonPrimaryText : theme.textSecondary}
                  >
                    {pos}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ThemedView>

        {/* 释义输入 */}
        <ThemedView level="tertiary" style={styles.inputContainer}>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.label}>
            释义 *
          </ThemedText>
          <ChineseInput
            style={[styles.input, styles.textArea]}
            placeholder="输入释义"
            placeholderTextColor={theme.textMuted}
            value={definition}
            onChangeText={setDefinition}
            multiline
            numberOfLines={2}
          />
        </ThemedView>

        {/* 拆分输入 */}
        <ThemedView level="tertiary" style={styles.inputContainer}>
          <View style={styles.labelRow}>
            <View style={styles.splitLabelContainer}>
              <ThemedText variant="body" color={theme.textSecondary} style={styles.label}>
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
              {/* 编码输入 */}
              <View style={styles.splitCodeRow}>
                <EnglishInput
                  style={styles.splitCodeInput}
                  placeholder="编码"
                  placeholderTextColor={theme.textMuted}
                  value={item.code}
                  onChangeText={(text) => handleCodeInput(index, text)}
                  onFocus={() => setActiveCodeIndex(index)}
                  onBlur={() => setActiveCodeIndex(-1)}
                />
                <ThemedText variant="body" color={theme.textMuted}>-</ThemedText>
                <ChineseInput
                  style={styles.splitContentInput}
                  placeholder="含义"
                  placeholderTextColor={theme.textMuted}
                  value={item.content}
                  onChangeText={(text) => handleContentChange(index, text)}
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
                      onPress={() => handlePerformSplit(index, charIndex)}
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
        </ThemedView>

        {/* 短句输入 */}
        <ThemedView level="tertiary" style={styles.inputContainer}>
          <View style={styles.labelRow}>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.label}>
              助记句子
            </ThemedText>
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
          <AutoInput
            style={[styles.input, styles.textArea]}
            placeholder="例：王（w）阿姨（ay）教我方法"
            placeholderTextColor={theme.textMuted}
            value={sentence}
            onChangeText={handleSentenceChange}
            multiline
            numberOfLines={1}
          />
        </ThemedView>

        {/* 例句输入 */}
        <ThemedView level="tertiary" style={styles.inputContainer}>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.label}>
            例句（可选）
          </ThemedText>
          <AutoInput
            style={[styles.input, styles.textArea]}
            placeholder="输入例句，帮助理解单词用法"
            placeholderTextColor={theme.textMuted}
            value={example}
            onChangeText={setExample}
            multiline
            numberOfLines={2}
          />
        </ThemedView>

        {/* 保存按钮 */}
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <ThemedText variant="h3" color={theme.buttonPrimaryText}>
            {loading ? '保存中...' : '保存'}
          </ThemedText>
        </TouchableOpacity>

        {/* 提示 */}
        <ThemedText variant="caption" color={theme.textMuted} style={styles.hint}>
          * 为必填项 • 助记中可用括号引用拆分：阿婆（ap）拿着苹果跑了（ple）
        </ThemedText>
      </ScrollView>

      {/* 音标键盘 */}
      <Modal
        visible={showPhoneticKeyboard}
        transparent
        animationType="slide"
      >
        <View style={styles.keyboardModalOverlay}>
          <TouchableOpacity
            style={styles.keyboardCloseArea}
            activeOpacity={1}
            onPress={() => setShowPhoneticKeyboard(false)}
          >
            <View style={styles.keyboardDragHandle} />
          </TouchableOpacity>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <View style={styles.keyboardContainer}>
              <PhoneticKeyboard
                onKeyPress={(symbol) => setPhonetic(phonetic + symbol)}
                onDelete={() => setPhonetic(phonetic.slice(0, -1))}
              />
              <TouchableOpacity
                style={styles.keyboardHideButton}
                onPress={() => setShowPhoneticKeyboard(false)}
              >
                <ThemedText variant="body" color={theme.buttonPrimaryText}>完成</ThemedText>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Screen>
  );
}
