import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing['2xl'],
      paddingBottom: Spacing['5xl'],
    },
    headerActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xl,
    },
    headerButton: {
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
    },
    headerButtons: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    wordContainer: {
      marginBottom: Spacing.xl,
    },
    phonetic: {
      marginTop: Spacing.sm,
    },
    card: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.lg,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    definitionText: {
      lineHeight: 24,
    },
    partOfSpeechTag: {
      alignSelf: 'flex-start',
      backgroundColor: theme.primary,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.md,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: Spacing.md,
    },
    statItem: {
      alignItems: 'center',
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.border,
    },
    reviewTime: {
      marginTop: Spacing.md,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
