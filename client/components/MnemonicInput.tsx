import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEvent,
  TextInputSelectionChangeEventData
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

// 文本片段类型
export interface TextFragment {
  id: string;
  type: 'text' | 'code';
  text: string;
  codeKey?: string;
  meanings?: string[]; // 如果是 code 类型，存储对应的含义列表
}

interface MnemonicInputProps {
  value: string;
  onChange: (value: string) => void;
  codes: { letter: string; chinese: string }[];
  placeholder?: string;
  multiline?: boolean;
  style?: any;
}

export const MnemonicInput: React.FC<MnemonicInputProps> = ({
  value,
  onChange,
  codes,
  placeholder,
  multiline = false,
  style
}) => {
  const { theme } = useTheme();
  const [fragments, setFragments] = useState<TextFragment[]>([]);
  const [activeFragmentId, setActiveFragmentId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRefs = useRef<Map<string, TextInput>>(new Map());

  // 获取编码对应的含义列表
  const getCodeMeanings = useCallback((code: string, codeList: { letter: string; chinese: string }[]): string[] => {
    const matched = codeList.find(c => c.letter.toLowerCase() === code.toLowerCase());
    if (!matched) return [];

    // 使用 "、" 作为分隔符拆分含义
    return matched.chinese.split(/[,，、]/).map(m => m.trim()).filter(m => m);
  }, []);

  // 解析文本为片段
  const parseTextToFragments = useCallback((text: string): TextFragment[] => {
    if (!text.trim()) {
      return [{ id: '0', type: 'text', text }];
    }

    const result: TextFragment[] = [];
    let currentIndex = 0;
    let idCounter = 0;

    while (currentIndex < text.length) {
      let foundCode = false;

      // 检测编码格式：（xxx）
      const openParenIndex = text.indexOf('（', currentIndex);
      const closeParenIndex = text.indexOf('）', currentIndex);

      if (openParenIndex !== -1 && closeParenIndex !== -1 && closeParenIndex > openParenIndex) {
        // 前面的文本
        if (openParenIndex > currentIndex) {
          result.push({
            id: String(idCounter++),
            type: 'text',
            text: text.substring(currentIndex, openParenIndex)
          });
        }

        // 编码部分
        const code = text.substring(openParenIndex + 1, closeParenIndex);
        result.push({
          id: String(idCounter++),
          type: 'code',
          text: `（${code}）`,
          codeKey: code,
          meanings: getCodeMeanings(code, codes)
        });

        currentIndex = closeParenIndex + 1;
        foundCode = true;
      }

      if (!foundCode) {
        // 剩余文本
        result.push({
          id: String(idCounter++),
          type: 'text',
          text: text.substring(currentIndex)
        });
        break;
      }
    }

    // 过滤空片段
    return result.filter(f => f.text.length > 0);
  }, [codes, getCodeMeanings]);

  // 检查文本是否匹配编码的任何一个含义
  const checkCodeMatch = useCallback((text: string, fragmentId: string): TextFragment | null => {
    if (!text.trim()) return null;

    for (const codeItem of codes) {
      const meanings = getCodeMeanings(codeItem.letter, codes);
      
      for (const meaning of meanings) {
        // 检查文本是否以含义结尾
        if (text.endsWith(meaning) && text.trim() === meaning) {
          return {
            id: `${fragmentId}_code_${Date.now()}`,
            type: 'code',
            text: `（${codeItem.letter}）`,
            codeKey: codeItem.letter,
            meanings: [meaning]
          };
        }
      }
    }

    return null;
  }, [codes, getCodeMeanings]);

  // 将片段合并为字符串
  const fragmentsToText = useCallback((fragmentList: TextFragment[]): string => {
    return fragmentList.map(f => f.text).join('');
  }, []);

  // 合并相邻的文本片段
  const mergeTextFragments = useCallback((fragmentList: TextFragment[]): TextFragment[] => {
    const result: TextFragment[] = [];
    let idCounter = 0;
    
    for (let i = 0; i < fragmentList.length; i++) {
      const current = { ...fragmentList[i], id: String(idCounter++) };
      
      if (current.type === 'text') {
        // 检查是否可以与下一个文本片段合并
        while (i < fragmentList.length - 1 && fragmentList[i + 1].type === 'text') {
          current.text = current.text + fragmentList[i + 1].text;
          i++; // 跳过下一个片段
        }
      }
      
      result.push(current);
    }
    
    return result;
  }, []);

  // 初始化片段
  useEffect(() => {
    const newFragments = parseTextToFragments(value);
    setFragments(newFragments);
  }, [value, parseTextToFragments]);

  // 处理文本变化
  const handleTextChange = useCallback((fragmentId: string, newText: string) => {
    setFragments(prev => {
      const fragmentIndex = prev.findIndex(f => f.id === fragmentId);
      if (fragmentIndex === -1) return prev;

      const newFragments = [...prev];
      
      // 检查是否匹配编码
      const codeFragment = checkCodeMatch(newText, fragmentId);
      
      if (codeFragment) {
        // 插入编码片段
        newFragments[fragmentIndex] = {
          ...newFragments[fragmentIndex],
          text: newText
        };
        newFragments.splice(fragmentIndex + 1, 0, codeFragment);
      } else {
        // 更新文本片段
        newFragments[fragmentIndex] = {
          ...newFragments[fragmentIndex],
          text: newText
        };
      }

      // 检查后续编码片段是否需要移除
      if (fragmentIndex > 0) {
        const prevFragment = newFragments[fragmentIndex - 1];
        if (prevFragment.type === 'code' && prevFragment.meanings) {
          // 检查当前文本是否匹配编码的任一含义
          const stillMatches = prevFragment.meanings.some(meaning => newText === meaning);
          if (!stillMatches) {
            // 移除编码片段
            newFragments.splice(fragmentIndex - 1, 1);
          }
        }
      }

      // 合并相邻的文本片段
      const mergedFragments = mergeTextFragments(newFragments);
      
      // 通知父组件
      onChange(fragmentsToText(mergedFragments));
      
      return mergedFragments;
    });
  }, [checkCodeMatch, fragmentsToText, mergeTextFragments]);

  // 处理按键事件（删除键）
  const handleKeyPress = useCallback((e: any, fragmentId: string) => {
    const key = e?.nativeEvent?.key;
    
    if (key === 'Backspace') {
      const input = inputRefs.current.get(fragmentId);
      if (!input) return;

      // 获取当前光标位置
      const selection = input.props.selection || { start: 0, end: 0 };
      
      // 如果光标在开头，尝试删除上一个文本片段的最后一个字符
      if (selection.start === 0 && selection.end === 0) {
        setFragments(prev => {
          const fragmentIndex = prev.findIndex(f => f.id === fragmentId);
          if (fragmentIndex <= 0) return prev;

          // 查找上一个文本片段
          for (let i = fragmentIndex - 1; i >= 0; i--) {
            if (prev[i].type === 'text') {
              const newFragments = [...prev];
              
              if (newFragments[i].text.length > 0) {
                // 删除最后一个字符
                newFragments[i] = {
                  ...newFragments[i],
                  text: newFragments[i].text.slice(0, -1)
                };
                
                // 通知父组件
                onChange(fragmentsToText(newFragments));
                
                // 聚焦到上一个文本片段
                setTimeout(() => {
                  const prevInput = inputRefs.current.get(newFragments[i].id);
                  if (prevInput) {
                    prevInput.focus();
                    prevInput.setNativeProps({
                      selection: { start: newFragments[i].text.length, end: newFragments[i].text.length }
                    });
                  }
                }, 0);
                
                return newFragments;
              } else {
                // 上一个片段为空，移除它
                newFragments.splice(i, 1);
                
                // 通知父组件
                onChange(fragmentsToText(newFragments));
                
                // 聚焦到更前面的片段或当前片段
                if (i > 0) {
                  const prevPrevInput = inputRefs.current.get(newFragments[i - 1].id);
                  if (prevPrevInput) {
                    setTimeout(() => {
                      prevPrevInput.focus();
                      const prevPrevFragment = newFragments[i - 1];
                      prevPrevInput.setNativeProps({
                        selection: { start: prevPrevFragment.text.length, end: prevPrevFragment.text.length }
                      });
                    }, 0);
                  }
                } else {
                  setTimeout(() => {
                    input.focus();
                  }, 0);
                }
                
                return newFragments;
              }
            }
          }
          
          return prev;
        });
      }
    }
  }, [onChange, fragmentsToText]);

  // 处理文本片段的选择变化
  const handleSelectionChange = useCallback((e: NativeSyntheticEvent<TextInputSelectionChangeEventData>, fragmentId: string) => {
    const input = inputRefs.current.get(fragmentId);
    if (!input) return;

    const { start, end } = e.nativeEvent.selection;
    
    if (start === 0 && end === 0) {
      // 光标在开头
      setFragments(prev => {
        const fragmentIndex = prev.findIndex(f => f.id === fragmentId);
        if (fragmentIndex <= 0) return prev;

        // 检查上一个片段是否是编码片段
        if (prev[fragmentIndex - 1].type === 'code') {
          // 跳过编码片段，找到上一个文本片段
          for (let i = fragmentIndex - 2; i >= 0; i--) {
            if (prev[i].type === 'text') {
              const prevInput = inputRefs.current.get(prev[i].id);
              if (prevInput) {
                setTimeout(() => {
                  prevInput.focus();
                  prevInput.setNativeProps({
                    selection: { start: prev[i].text.length, end: prev[i].text.length }
                  });
                }, 0);
              }
              break;
            }
          }
        }
        
        return prev;
      });
    }
  }, []);

  // 聚焦到最后一个文本片段
  const focusLastFragment = useCallback(() => {
    const textFragments = fragments.filter(f => f.type === 'text');
    if (textFragments.length > 0) {
      const lastFragment = textFragments[textFragments.length - 1];
      const input = inputRefs.current.get(lastFragment.id);
      if (input) {
        input.focus();
      }
    }
  }, [fragments]);

  // 获取输入框样式
  const getStyles = () => {
    return StyleSheet.create({
      container: {
        width: '100%',
        minHeight: multiline ? 100 : 44,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: theme.backgroundTertiary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
      },
      scrollView: {
        width: '100%',
      },
      fragmentsContainer: {
        flexDirection: multiline ? 'column' : 'row',
        flexWrap: multiline ? 'wrap' : 'nowrap',
        alignItems: multiline ? 'flex-start' : 'center',
        minHeight: multiline ? 100 : 44,
      },
      textInput: {
        fontSize: 16,
        color: theme.textPrimary,
        minWidth: 20,
        padding: 0,
        backgroundColor: 'transparent',
      },
      codeText: {
        fontSize: 16,
        color: theme.primary,
        fontWeight: '600',
        paddingVertical: 2,
        paddingHorizontal: 4,
        backgroundColor: `${theme.primary}15`,
        borderRadius: 4,
        marginLeft: 2,
        marginRight: 2,
        alignSelf: 'center',
      },
      placeholder: {
        position: 'absolute',
        fontSize: 16,
        color: theme.textMuted,
        pointerEvents: 'none',
        top: 12,
        left: 16,
      },
    });
  };

  const styles = getStyles();

  return (
    <View style={[styles.container, style]}>
      {fragments.length === 0 && placeholder && (
        <Text style={styles.placeholder}>{placeholder}</Text>
      )}
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        horizontal={multiline ? false : true}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
      >
        <View style={styles.fragmentsContainer}>
          {fragments.map((fragment) => {
            if (fragment.type === 'text') {
              return (
                <TextInput
                  key={fragment.id}
                  ref={(ref) => {
                    if (ref) {
                      inputRefs.current.set(fragment.id, ref);
                    }
                  }}
                  style={styles.textInput}
                  value={fragment.text}
                  onChangeText={(text) => handleTextChange(fragment.id, text)}
                  onKeyPress={(e) => handleKeyPress(e, fragment.id)}
                  onSelectionChange={(e) => handleSelectionChange(e, fragment.id)}
                  onFocus={() => setActiveFragmentId(fragment.id)}
                  placeholder=""
                  multiline={false}
                />
              );
            } else {
              return (
                <Text key={fragment.id} style={styles.codeText}>
                  {fragment.text}
                </Text>
              );
            }
          })}
        </View>
      </ScrollView>
    </View>
  );
};
