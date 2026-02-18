import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing['2xl'],
      paddingBottom: Spacing.lg,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: theme.primary,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
    },
    scrollContent: {
      padding: Spacing.lg,
      paddingBottom: Spacing['5xl'],
    },
    projectCard: {
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
    },
    projectContent: {
      padding: Spacing.lg,
    },
    projectHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    projectTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: Spacing.md,
    },
    projectIcon: {
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: `${theme.primary}20`,
    },
    deleteButton: {
      padding: Spacing.sm,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
    },
    statItem: {
      alignItems: 'center',
    },
    statDivider: {
      width: 1,
      height: 30,
      backgroundColor: theme.border,
    },
    reviewButtonContainer: {
      marginTop: Spacing.md,
      backgroundColor: theme.warning,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      alignSelf: 'flex-start',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Spacing['3xl'],
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: Spacing['5xl'],
    },
    emptyTitle: {
      marginTop: Spacing.lg,
    },
    emptyText: {
      marginTop: Spacing.sm,
      textAlign: 'center',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.backgroundRoot,
      borderTopLeftRadius: BorderRadius['2xl'],
      borderTopRightRadius: BorderRadius['2xl'],
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalBody: {
      padding: Spacing.lg,
    },
    label: {
      marginBottom: Spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      fontSize: 16,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    modalFooter: {
      flexDirection: 'row',
      padding: Spacing.lg,
      gap: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    modalButton: {
      flex: 1,
      paddingVertical: Spacing.lg,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
    },
    saveButton: {
      opacity: 1,
    },
    cancelButton: {
      opacity: 1,
    },
  });
};
