import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Network from 'expo-network';

/**
 * 网络状态
 */
export interface NetworkState {
  /** 是否连接到网络 */
  isConnected: boolean;
  /** 是否正在检查网络状态 */
  isChecking: boolean;
  /** 最后检查时间 */
  lastChecked: Date | null;
  /** 网络类型（如 WiFi、Cellular） */
  type: Network.NetworkStateType | null;
}

/**
 * 网络状态 Hook 返回值
 */
export interface UseNetwork extends NetworkState {
  /** 手动刷新网络状态 */
  checkNetwork: () => Promise<boolean>;
  /** 显示网络错误提示（用于在无网络时提醒用户） */
  showNetworkError: () => void;
}

/**
 * 网络状态 Hook
 * 用于检测网络连接状态
 */
export function useNetwork(): UseNetwork {
  const [state, setState] = useState<NetworkState>({
    isConnected: true,
    isChecking: false,
    lastChecked: null,
    type: null,
  });

  // 检查网络状态
  const checkNetwork = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isChecking: true }));
    
    try {
      const networkState = await Network.getNetworkStateAsync();
      const isConnected = networkState.isConnected ?? false;
      
      setState({
        isConnected,
        isChecking: false,
        lastChecked: new Date(),
        type: networkState.type ?? null,
      });
      
      return isConnected;
    } catch (error) {
      console.error('检查网络状态失败:', error);
      setState({
        isConnected: false,
        isChecking: false,
        lastChecked: new Date(),
        type: null,
      });
      return false;
    }
  }, []);

  // 显示网络错误提示
  const showNetworkError = useCallback(() => {
    Alert.alert(
      '网络错误',
      '请检查您的网络连接后重试',
      [{ text: '确定' }]
    );
  }, []);

  // 初始化时检查网络状态
  useEffect(() => {
    // 使用异步函数避免同步 setState 警告
    const initNetworkCheck = async () => {
      await checkNetwork();
    };
    initNetworkCheck();
  }, [checkNetwork]);

  return {
    ...state,
    checkNetwork,
    showNetworkError,
  };
}
