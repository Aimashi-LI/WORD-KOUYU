import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.lg,
    },
    headerTitle: {
      flex: 1,
    },
    headerSubtitle: {
      marginTop: 2,
    },
    backButton: {
      padding: Spacing.sm,
      marginRight: Spacing.sm,
    },
    listContent: {
      padding: Spacing.lg,
    },
    wordItem: {
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.sm,
    },
    wordHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.xs,
    },
    wordTitle: {
      flex: 1,
    },
    wordPhonetic: {
      marginTop: Spacing.xs,
    },
    wordActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
    },
    earlyReviewButton: {
      backgroundColor: theme.warning + '20',
      borderWidth: 1,
      borderColor: theme.warning,
    },
    reviewButton: {
      backgroundColor: theme.primary,
    },
    actionButtonText: {
      fontSize: 13,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Spacing.xl,
    },
    emptyIcon: {
      marginBottom: Spacing.lg,
    },
    emptyTitle: {
      marginBottom: Spacing.sm,
    },
    emptyText: {
      textAlign: 'center',
    },
  });
};
