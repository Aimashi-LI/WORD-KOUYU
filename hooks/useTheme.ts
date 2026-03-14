import { Colors } from '@/constants/theme';
import { useThemeSwitch } from '@/hooks/useThemeSwitch';

function getTheme(colorScheme?: 'dark' | 'light' | null) {
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];

  return {
    theme,
    isDark,
  };
}

function useTheme() {
  const { actualColorScheme } = useThemeSwitch();
  return getTheme(actualColorScheme);
}

export {
  useTheme,
}
