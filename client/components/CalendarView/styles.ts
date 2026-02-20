import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      padding: Spacing.md,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    // 月份导航
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    navButton: {
      padding: Spacing.sm,
      borderRadius: BorderRadius.md,
    },
    monthYear: {
      alignItems: 'center',
    },
    // 星期标题
    weekDays: {
      flexDirection: 'row',
      marginBottom: Spacing.xs,
    },
    weekDayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Spacing.xs,
    },
    // 日历网格
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: BorderRadius.sm,
    },
    dayCellSelected: {
      backgroundColor: theme.primary,
    },
    dayCellPast: {
      opacity: 0.5,
    },
    dayContent: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayText: {
      fontSize: 14,
    },
    dayTextToday: {
      fontWeight: '600',
    },
    emptyCell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
    },
    // 标记点
    markDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.primary,
      marginTop: 2,
    },
    markDotSelected: {
      backgroundColor: theme.buttonPrimaryText,
    },
  });
};
