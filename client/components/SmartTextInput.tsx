import React, { useState, useCallback } from 'react';
import { TextInput, TextInputProps, Platform, View } from 'react-native';

// 语言类型
type LanguageType = 'auto' | 'en' | 'zh';

interface SmartTextInputProps extends Omit<TextInputProps, 'keyboardType'> {
  // 期望的输入语言类型：'auto' 自动检测, 'en' 英文优先, 'zh' 中文优先
  preferredLanguage?: LanguageType;
  // 初始语言（用于刚打开键盘时）
  initialLanguage?: LanguageType;
  // 输入内容变化回调
  onContentChange?: (text: string, detectedLanguage: LanguageType) => void;
}

// 检测字符是否为中文
const isChinese = (char: string): boolean => {
  const unicode = char.charCodeAt(0);
  return (
    (unicode >= 0x4e00 && unicode <= 0x9fff) || // CJK 统一汉字
    (unicode >= 0x3400 && unicode <= 0x4dbf) || // CJK 统一汉字扩展 A
    (unicode >= 0x20000 && unicode <= 0x2a6df) || // CJK 统一汉字扩展 B
    (unicode >= 0x2a700 && unicode <= 0x2b73f) || // CJK 统一汉字扩展 C
    (unicode >= 0x2b740 && unicode <= 0x2b81f) || // CJK 统一汉字扩展 D
    (unicode >= 0x2b820 && unicode <= 0x2ceaf) || // CJK 统一汉字扩展 E
    (unicode >= 0x2ceb0 && unicode <= 0x2ebef) || // CJK 统一汉字扩展 F
    (unicode >= 0x3000 && unicode <= 0x303f) || // CJK 符号和标点
    (unicode >= 0xff00 && unicode <= 0xffef) || // 全角 ASCII
    (unicode >= 0x3000 && unicode <= 0x303f) // 日文假名和符号
  );
};

// 检测字符串的主要语言
const detectLanguage = (text: string): LanguageType => {
  if (!text || text.length === 0) return 'auto';
  
  // 统计中文字符数量
  let chineseCount = 0;
  let englishCount = 0;
  
  for (const char of text) {
    if (isChinese(char)) {
      chineseCount++;
    } else if (/[a-z]/i.test(char)) {
      englishCount++;
    }
  }
  
  // 根据字符比例判断语言
  const total = chineseCount + englishCount;
  if (total === 0) return 'auto';
  
  if (chineseCount > englishCount) {
    return 'zh';
  } else if (englishCount > chineseCount) {
    return 'en';
  }
  
  return 'auto';
};

// 获取键盘类型
const getKeyboardType = (language: LanguageType, preferredLanguage: LanguageType): TextInput['props']['keyboardType'] => {
  // 如果用户明确指定了语言，优先使用
  if (preferredLanguage === 'en') {
    return Platform.OS === 'ios' ? 'ascii-capable' : 'default';
  }
  if (preferredLanguage === 'zh') {
    return 'default';
  }
  
  // 自动检测模式
  if (language === 'en') {
    return Platform.OS === 'ios' ? 'ascii-capable' : 'default';
  }
  if (language === 'zh') {
    return 'default';
  }
  
  // 默认返回默认键盘
  return 'default';
};

// 获取自动纠正配置
const getAutoCorrect = (language: LanguageType): boolean => {
  // 英文输入时关闭自动纠正，中文时可以开启
  return language === 'zh';
};

// 获取拼写检查配置
const getSpellCheck = (language: LanguageType): boolean => {
  // 英文输入时关闭拼写检查，中文时可以开启
  return language === 'zh';
};

export function SmartTextInput({
  preferredLanguage = 'auto',
  initialLanguage = 'auto',
  onContentChange,
  onChangeText,
  value,
  ...props
}: SmartTextInputProps) {
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageType>(initialLanguage);
  
  // 当检测到语言变化时，更新键盘配置
  const handleTextChange = useCallback((text: string) => {
    // 检测语言
    const newLanguage = detectLanguage(text);
    
    // 如果检测到明确的语言，且与当前不同，则更新状态
    if (newLanguage !== 'auto' && newLanguage !== detectedLanguage) {
      setDetectedLanguage(newLanguage);
    }
    
    // 回调原 onChangeText
    if (onChangeText) {
      onChangeText(text);
    }
    
    // 回调内容变化
    if (onContentChange) {
      onContentChange(text, newLanguage);
    }
  }, [detectedLanguage, onChangeText, onContentChange]);
  
  // 计算当前键盘配置（根据检测到的语言和用户偏好）
  const currentLanguage = detectedLanguage !== 'auto' ? detectedLanguage : initialLanguage;
  const keyboardType = getKeyboardType(currentLanguage, preferredLanguage);
  const autoCorrect = getAutoCorrect(currentLanguage);
  const spellCheck = getSpellCheck(currentLanguage);
  
  return (
    <TextInput
      {...props}
      value={value}
      onChangeText={handleTextChange}
      keyboardType={keyboardType}
      autoCorrect={autoCorrect}
      spellCheck={spellCheck}
    />
  );
}

// 专门用于单词输入的组件（英文优先）
export function EnglishInput(props: Omit<SmartTextInputProps, 'preferredLanguage' | 'keyboardType'>) {
  return (
    <SmartTextInput
      {...props}
      preferredLanguage="en"
      initialLanguage="en"
      placeholder="请输入单词"
      autoCorrect={false}
      spellCheck={false}
      autoCapitalize="none"
    />
  );
}

// 专门用于中文输入的组件（中文优先）
export function ChineseInput(props: Omit<SmartTextInputProps, 'preferredLanguage' | 'keyboardType'>) {
  return (
    <SmartTextInput
      {...props}
      preferredLanguage="zh"
      initialLanguage="zh"
      placeholder="请输入中文"
    />
  );
}

// 自动检测输入组件
export function AutoInput(props: Omit<SmartTextInputProps, 'preferredLanguage' | 'keyboardType'>) {
  return (
    <SmartTextInput
      {...props}
      preferredLanguage="auto"
    />
  );
}
