import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { AuthProvider } from "@/contexts/AuthContext";
import { ColorSchemeProvider } from '@/hooks/useColorScheme';
import { ThemeSwitchProvider } from '@/hooks/useThemeSwitch';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
  '"shadow*" style props are deprecated. Use "boxShadow".',
  'props.pointerEvents is deprecated. Use style.pointerEvents',
  // 添加其它想暂时忽略的错误或警告信息
]);

export default function RootLayout() {
  // 添加调试工具：捕获 React key 警告
  useEffect(() => {
    const originalWarn = console.warn;
    console.warn = function(...args) {
      const message = args[0];
      // 检查是否是 key 警告
      if (typeof message === 'string' && message.includes('two children with the same key')) {
        console.error('=== Key 警告 ===');
        console.error('警告信息:', message);
        console.error('调用栈:');
        console.trace();
        console.error('================');
      }
      // 调用原始 console.warn
      originalWarn.apply(console, args);
    };

    return () => {
      console.warn = originalWarn;
    };
  }, []);

  return (
    <AuthProvider>
      <ColorSchemeProvider>
        <ThemeSwitchProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="dark"></StatusBar>
            <Stack screenOptions={{
            // 设置所有页面的切换动画为从右侧滑入，适用于iOS 和 Android
            animation: 'slide_from_right',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            // 隐藏自带的头部
            headerShown: false
          }}>
            <Stack.Screen name="(tabs)" options={{ title: "" }} />
            <Stack.Screen 
              name="add-word" 
              options={{ 
                title: "添加单词",
                presentation: 'card'
              }} 
            />
            <Stack.Screen 
              name="import-words" 
              options={{ 
                title: "批量导入",
                presentation: 'card'
              }} 
            />
            <Stack.Screen 
              name="paste-import" 
              options={{ 
                title: "文本粘贴",
                presentation: 'card'
              }} 
            />
            <Stack.Screen 
              name="word-detail" 
              options={{ 
                title: "单词详情",
                presentation: 'card'
              }} 
            />
            <Stack.Screen 
              name="review" 
              options={{ 
                title: "复习项目",
                presentation: 'card'
              }} 
            />
            <Stack.Screen 
              name="review-plan" 
              options={{ 
                title: "复习计划",
                presentation: 'card'
              }} 
            />
            <Stack.Screen
              name="review-detail"
              options={{
                title: "单词复习",
                presentation: 'card'
              }}
            />
            <Stack.Screen 
              name="brush-words" 
              options={{ 
                title: "刷单词",
                presentation: 'card'
              }} 
            />
            <Stack.Screen 
              name="about" 
              options={{ 
                title: "关于",
                presentation: 'card'
              }} 
            />
          </Stack>
          <Toast />
        </GestureHandlerRootView>
      </ThemeSwitchProvider>
      </ColorSchemeProvider>
    </AuthProvider>
  );
}
