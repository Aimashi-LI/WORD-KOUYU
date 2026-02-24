import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export interface ShadowText {
  code: string;
  text: string;
  position: number;
}

interface SentenceInputProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  style?: any;
  multiline?: boolean;
  numberOfLines?: number;
  autoFocus?: boolean;
  onAutoCompleteChange?: (enabled: boolean) => void; // 回调：通知父组件自动补全状态的变化
}

export function SentenceInput({
  value,
  onChange,
  placeholder,
  placeholderTextColor,
  style,
  multiline = false,
  numberOfLines = 4,
  autoFocus = false,
  onAutoCompleteChange
}: SentenceInputProps) {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [contentHeight, setContentHeight] = useState(44);

  // 提取影子文本（编码）和纯文本
  const parseText = (text: string) => {
    const shadowRegex = /（([^）]+)）/g;
    const shadows: ShadowText[] = [];
    let match;
    let lastIndex = 0;
    let pureText = '';
    let positionAdjustment = 0;

    while ((match = shadowRegex.exec(text)) !== null) {
      const fullMatch = match[0];
      const code = match[1];
      const start = match.index;
      const end = match.index + fullMatch.length;

      // 添加编码前的纯文本
      pureText += text.substring(lastIndex, start);

      // 添加占位符（使用零宽字符确保占位）
      const placeholder = '\u200B'.repeat(fullMatch.length);
      pureText += placeholder;

      // 记录影子文本信息
      shadows.push({
        code,
        text: fullMatch,
        position: start + positionAdjustment
      });

      positionAdjustment += fullMatch.length - placeholder.length;
      lastIndex = end;
    }

    // 添加剩余文本
    pureText += text.substring(lastIndex);

    return { pureText, shadows };
  };

  const { pureText, shadows } = parseText(value);

  // 处理文本变化
  const handleTextChange = (newText: string) => {
    // 检查删除操作
    if (newText.length < pureText.length) {
      const deletedCount = pureText.length - newText.length;
      const sortedShadows = [...shadows].sort((a, b) => b.position - a.position);
      
      // 从后向前检查
      for (const shadow of sortedShadows) {
        // 检查删除操作是否在影子文本的右侧
        const textEnd = pureText.length;
        
        // 如果删除操作在影子文本的右侧
        if (textEnd === shadow.position + shadow.text.length) {
          // 查找影子文本前面的含义
          let meaningStart = shadow.position;
          
          // 向前查找含义起始位置（跳过其他影子文本）
          for (let j = shadow.position - 1; j >= 0; j--) {
            if (pureText[j] === '\u200B') {
              // 跳过占位符
              continue;
            }
            if (j === 0 || pureText[j - 1] === '\u200B') {
              meaningStart = j;
              break;
            }
          }
          
          const meaningText = value.substring(meaningStart, shadow.position);
          
          if (meaningText.length > 0) {
            const newMeaningText = meaningText.substring(0, meaningText.length - 1);
            
            // 重建完整的文本
            const beforeShadow = value.substring(0, meaningStart);
            const afterShadow = value.substring(shadow.position);
            
            if (newMeaningText.length === 0) {
              // 含义被完全删除，移除影子文本，恢复自动补全
              const result = beforeShadow + afterShadow;
              onChange(result);
              onAutoCompleteChange?.(true); // 恢复自动补全
              return;
            } else {
              // 含义被部分删除，保留影子文本，关闭自动补全
              const result = beforeShadow + newMeaningText + afterShadow;
              onChange(result);
              onAutoCompleteChange?.(false); // 关闭自动补全
              return;
            }
          }
        }
      }
    }
    
    // 正常更新（需要处理零宽占位符）
    // 找到第一个非零宽字符的位置
    let firstNonZeroWidthIndex = 0;
    for (let i = 0; i < newText.length; i++) {
      if (newText[i] !== '\u200B') {
        firstNonZeroWidthIndex = i;
        break;
      }
    }
    
    // 提取纯文本（去掉零宽占位符）
    let cleanText = '';
    for (let i = 0; i < newText.length; i++) {
      if (newText[i] !== '\u200B') {
        cleanText += newText[i];
      }
    }
    
    // 重建完整文本（重新插入影子文本）
    const { pureText: originalPureText, shadows: originalShadows } = parseText(value);
    
    // 检查是否需要更新影子文本的位置
    let result = cleanText;
    let positionAdjustment = 0;
    
    for (const shadow of originalShadows) {
      // 计算新的位置
      const newPosition = shadow.position + positionAdjustment;
      
      // 检查影子文本的位置是否还在有效范围内
      if (newPosition <= result.length) {
        // 插入影子文本
        result = result.substring(0, newPosition) + shadow.text + result.substring(newPosition);
        positionAdjustment += shadow.text.length;
      }
    }
    
    onChange(result);
    onAutoCompleteChange?.(true); // 恢复自动补全
  };

  // 构建显示的文本（用不同颜色显示影子文本）
  const buildDisplayText = () => {
    if (shadows.length === 0) {
      return [<Text key="text" style={{ color: theme.textPrimary }}>{value}</Text>];
    }

    const fragments = [];
    let lastPos = 0;
    
    for (const shadow of shadows) {
      // 添加普通文本
      if (shadow.position > lastPos) {
        fragments.push(
          <Text key={`text-${lastPos}`} style={{ color: theme.textPrimary }}>
            {value.substring(lastPos, shadow.position)}
          </Text>
        );
      }
      
      // 添加影子文本
      fragments.push(
        <Text key={`shadow-${shadow.code}`} style={{ color: theme.textMuted }}>
          {shadow.text}
        </Text>
      );
      
      lastPos = shadow.position + shadow.text.length;
    }
    
    // 添加剩余文本
    if (lastPos < value.length) {
      fragments.push(
        <Text key="text-end" style={{ color: theme.textPrimary }}>
          {value.substring(lastPos)}
        </Text>
      );
    }
    
    return fragments;
  };

  const handleContentSizeChange = (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
    setContentHeight(e.nativeEvent.contentSize.height);
  };

  return (
    <View style={[styles.container, style, { minHeight: contentHeight }]}>
      {value === '' ? (
        <TextInput
          ref={inputRef}
          value=""
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor || theme.textMuted}
          style={[styles.input, { color: theme.textPrimary, minHeight: contentHeight }]}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoFocus={autoFocus}
          onContentSizeChange={handleContentSizeChange}
        />
      ) : (
        <View style={[styles.textContainer, { minHeight: contentHeight }]}>
          <TextInput
            ref={inputRef}
            value={pureText}
            onChangeText={handleTextChange}
            style={[styles.input, styles.invisibleInput, { minHeight: contentHeight }]}
            multiline={multiline}
            numberOfLines={numberOfLines}
            autoFocus={autoFocus}
            onContentSizeChange={handleContentSizeChange}
          />
          <View style={[styles.textLayer, { minHeight: contentHeight }]}>
            <Text style={[styles.text, { color: theme.textPrimary }]}>
              {buildDisplayText()}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  textContainer: {
    position: 'relative',
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    padding: 0,
    margin: 0,
  },
  invisibleInput: {
    opacity: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  textLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    pointerEvents: 'none',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    padding: 0,
    margin: 0,
  },
});
