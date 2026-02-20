import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing['5xl'],
    },
    // 统计卡片
    statsCard: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      boxShadow: `0px 4px 12px rgba(0, 0, 0, 0.08)`,
    },
    statsTitle: {
      marginBottom: Spacing.md,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.border,
    },
    progressRow: {
      marginBottom: Spacing.md,
    },
    progressBar: {
      height: 6,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.success,
      borderRadius: 3,
    },
    extraStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    extraStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    // 快捷操作
    quickReviewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.primary,
      marginBottom: Spacing.xl,
      boxShadow: `0px 4px 12px rgba(0, 0, 0, 0.15)`,
    },
    quickReviewButtonDisabled: {
      backgroundColor: theme.backgroundTertiary,
      boxShadow: 'none',
    },
    // 选中日期卡片
    selectedDateCard: {
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: `${theme.primary}30`,
      backgroundColor: `${theme.primary}05`,
    },
    selectedDateHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
      paddingBottom: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: `${theme.primary}20`,
    },
    selectedDateWordItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.sm,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.xs,
    },
    startReviewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.primary,
      marginTop: Spacing.md,
    },
    // 分组容器
    sectionTitle: {
      marginBottom: Spacing.md,
    },
    groupContainer: {
      marginBottom: Spacing.lg,
    },
    groupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
      paddingBottom: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    dateItem: {
      marginBottom: Spacing.sm,
    },
    dateHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.xs,
      paddingVertical: Spacing.xs,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.sm,
    },
    dateLabel: {
      fontSize: 14,
      fontWeight: '600',
    },
    timeLabel: {
      fontSize: 12,
      fontWeight: '500',
    },
    wordItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.xs,
    },
    wordInfo: {
      flex: 1,
    },
    partOfSpeech: {
      fontSize: 12,
      paddingHorizontal: 4,
      paddingVertical: 2,
      backgroundColor: `${theme.primary}15`,
      borderRadius: 4,
      alignSelf: 'flex-start',
      marginTop: 2,
    },
    wordStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    // 加载和空状态
    loadingContainer: {
      paddingVertical: Spacing.xl,
      alignItems: 'center',
      gap: Spacing.md,
    },
    loadingText: {
      marginTop: Spacing.sm,
    },
    emptyContainer: {
      paddingVertical: Spacing['3xl'],
      alignItems: 'center',
    },
    emptyText: {
      marginTop: Spacing.md,
      textAlign: 'center',
    },
    emptySubtext: {
      marginTop: Spacing.xs,
      textAlign: 'center',
      fontSize: 12,
    },
  });
};
