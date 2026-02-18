import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: theme.backgroundRoot,
        borderTopColor: theme.border,
        height: Platform.OS === 'web' ? 60 : 50 + insets.bottom,
        paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom,
      },
      tabBarActiveTintColor: theme.primary,
      tabBarInactiveTintColor: theme.textMuted,
      tabBarItemStyle: {
        height: Platform.OS === 'web' ? 60 : undefined,
      },
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '单词本',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="book" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: '复习',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="graduation-cap" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="codebase"
        options={{
          title: '编码库',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="code" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
