import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeRouter } from '@/hooks/useSafeRouter';

const SPLASH_SHOWN_KEY = '@app:splash_shown';

export default function TabsIndex() {
  const router = useSafeRouter();

  useEffect(() => {
    const checkAndShowSplash = async () => {
      try {
        // 检查是否已经显示过 splash 页面
        const hasShownSplash = await AsyncStorage.getItem(SPLASH_SHOWN_KEY);

        // 如果没有显示过，则跳转到 splash 页面
        if (!hasShownSplash) {
          router.replace('/splash');
        }
      } catch (error) {
        console.error('检查 splash 页面失败:', error);
      }
    };

    checkAndShowSplash();
  }, []);

  return null;
}
