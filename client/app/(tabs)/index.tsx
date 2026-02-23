import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeRouter } from '@/hooks/useSafeRouter';

export default function TabsIndex() {
  const router = useSafeRouter();

  useEffect(() => {
    const checkAndShowSplash = async () => {
      try {
        // 每次启动都显示 splash 页面
        router.replace('/splash');
      } catch (error) {
        console.error('检查 splash 页面失败:', error);
      }
    };

    checkAndShowSplash();
  }, []);

  return null;
}
