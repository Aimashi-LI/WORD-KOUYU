import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 通知 ID
const REMINDER_NOTIFICATION_ID = 'word-review-reminder';

// 初始化通知设置
export async function initializeNotifications() {
  // Web 平台不支持本地通知，直接返回
  if (Platform.OS === 'web') {
    console.log('[通知] Web 平台不支持本地通知');
    return;
  }

  // 配置通知行为
  await Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// 请求通知权限
export async function requestNotificationPermissions(): Promise<boolean> {
  // Web 平台不支持本地通知，直接返回 false
  if (Platform.OS === 'web') {
    console.log('[通知] Web 平台不支持本地通知');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// 取消所有通知
export async function cancelAllNotifications() {
  if (Platform.OS === 'web') {
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
}

// 设置复习提醒通知
export async function scheduleReviewReminder(hour: number, minute: number) {
  // Web 平台不支持本地通知
  if (Platform.OS === 'web') {
    console.log(`[通知] Web 平台不支持本地通知，已模拟设置：${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    return;
  }

  // 先取消旧通知
  await cancelReminderNotification();

  // 设置新通知（每天重复）
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '复习提醒',
      body: '今天有单词需要复习哦！',
      data: {
        type: 'word-review',
      },
    },
    trigger: {
      hour,
      minute,
      repeats: true, // 每天重复
    },
  });

  console.log(`[通知] 已设置复习提醒：${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
}

// 取消复习提醒通知
export async function cancelReminderNotification() {
  if (Platform.OS === 'web') {
    console.log('[通知] Web 平台不支持本地通知');
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID);
  console.log('[通知] 已取消复习提醒');
}

// 获取当前已安排的通知
export async function getScheduledNotifications() {
  if (Platform.OS === 'web') {
    return [];
  }

  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  return notifications;
}

// 检查是否设置了复习提醒
export async function hasReminderScheduled(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const notifications = await getScheduledNotifications();
  return notifications.some(n => n.identifier === REMINDER_NOTIFICATION_ID);
}
