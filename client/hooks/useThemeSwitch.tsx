import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { ColorSchemeName, useColorScheme as useReactNativeColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 主题选择类型
export type ThemeChoice = 'light' | 'dark' | 'auto';

// 默认主题选择
const DEFAULT_THEME_CHOICE: ThemeChoice = 'auto';

// AsyncStorage 键
const THEME_STORAGE_KEY = '@word_review_theme_choice';

// 上下文类型
interface ThemeContextType {
  themeChoice: ThemeChoice;
  setThemeChoice: (choice: ThemeChoice) => void;
  actualColorScheme: 'light' | 'dark' | null;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 主题提供者
export const ThemeSwitchProvider = ({ children }: { children?: ReactNode }) => {
  const [themeChoice, setThemeChoiceState] = useState<ThemeChoice>(DEFAULT_THEME_CHOICE);
  const [loaded, setLoaded] = useState(false);
  const systemColorScheme = useReactNativeColorScheme();

  // 从 AsyncStorage 加载用户选择
  useEffect(() => {
    loadThemeChoice();
  }, []);

  // 加载主题选择
  const loadThemeChoice = async () => {
    try {
      const savedChoice = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedChoice && (savedChoice === 'light' || savedChoice === 'dark' || savedChoice === 'auto')) {
        setThemeChoiceState(savedChoice as ThemeChoice);
      }
    } catch (error) {
      console.error('加载主题设置失败:', error);
    } finally {
      setLoaded(true);
    }
  };

  // 保存主题选择
  const setThemeChoice = async (choice: ThemeChoice) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, choice);
      setThemeChoiceState(choice);
    } catch (error) {
      console.error('保存主题设置失败:', error);
    }
  };

  // 切换主题（在 light/dark 之间切换）
  const toggleTheme = () => {
    const newChoice: ThemeChoice = themeChoice === 'light' ? 'dark' : 'light';
    setThemeChoice(newChoice);
  };

  // 计算实际的颜色方案
  const actualColorScheme: 'light' | 'dark' | null = themeChoice === 'auto' ?
    (systemColorScheme === 'light' || systemColorScheme === 'dark' ? systemColorScheme : null) :
    themeChoice;

  const value: ThemeContextType = {
    themeChoice,
    setThemeChoice,
    actualColorScheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// 使用主题切换功能的 Hook
export const useThemeSwitch = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeSwitch 必须在 ThemeSwitchProvider 内部使用');
  }
  return context;
};
