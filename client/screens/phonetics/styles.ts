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
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholder: {
      width: 40,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: Spacing.md,
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.md,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.primary,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.lg,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: Spacing['3xl'],
    },
    emptyText: {
      marginTop: Spacing.lg,
    },
    emptyHint: {
      marginTop: Spacing.sm,
      textAlign: 'center',
    },
    phoneticItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.sm,
    },
    phoneticInfo: {
      flex: 1,
    },
    deleteButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: Spacing.sm,
    },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
    },
    modalContent: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: theme.backgroundRoot,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    input: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      fontSize: 16,
      color: theme.textPrimary,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: Spacing.md,
    },
    textArea: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    importHint: {
      marginBottom: Spacing.sm,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Spacing.md,
      marginTop: Spacing.md,
    },
    cancelButton: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
    },
    confirmButton: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.primary,
    },
  });
};
