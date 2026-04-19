import * as Notifications from 'expo-notifications';

// 通知 ID
const REMINDER_NOTIFICATION_ID = 'word-review-reminder';

// 初始化通知设置
export async function initializeNotifications() {
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
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// 取消所有通知
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// 设置复习提醒通知
export async function scheduleReviewReminder(hour: number, minute: number) {
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
  await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID);
  console.log('[通知] 已取消复习提醒');
}

// 获取当前已安排的通知
export async function getScheduledNotifications() {
  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  return notifications;
}

// 检查是否设置了复习提醒
export async function hasReminderScheduled(): Promise<boolean> {
  const notifications = await getScheduledNotifications();
  return notifications.some(n => n.identifier === REMINDER_NOTIFICATION_ID);
}
