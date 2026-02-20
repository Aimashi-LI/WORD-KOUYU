import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: Spacing.md,
    },
    loadingText: {
      marginTop: Spacing.sm,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xl,
    },
    emptyTitle: {
      marginTop: Spacing.lg,
    },
    emptyText: {
      marginTop: Spacing.sm,
      textAlign: 'center',
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
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
    progressContainer: {
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    progressBar: {
      height: 4,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.full,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.full,
    },
    cardContainer: {
      flex: 1,
      padding: Spacing.lg,
      justifyContent: 'center',
    },
    wordCard: {
      padding: Spacing.xl,
      borderRadius: BorderRadius.xl,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      elevation: 8, // Android 阴影
      gap: Spacing.md,
    },
    wordPartOfSpeechRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      flexWrap: 'wrap',
    },
    wordText: {
      textAlign: 'center',
    },
    inlinePartOfSpeech: {
      fontSize: 14,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      backgroundColor: `${theme.primary}15`,
      borderRadius: 8,
    },
    addPartOfSpeechButton: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      backgroundColor: `${theme.backgroundTertiary}`,
      borderRadius: 8,
    },
    addPartOfSpeechText: {
      fontSize: 14,
    },
    wordSection: {
      alignItems: 'center',
      gap: Spacing.sm,
    },
    phonetic: {
      textAlign: 'center',
    },
    splitSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
    },
    splitRow: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    splitLabel: {
      minWidth: 60,
    },
    splitValue: {
      flex: 1,
      textAlign: 'left',
    },
    mnemonicSection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
    },
    mnemonicText: {
      flex: 1,
      lineHeight: 22,
    },
    partOfSpeech: {
      marginBottom: Spacing.xs,
    },
    definitionSection: {
      gap: Spacing.md,
    },
    sentence: {
      marginTop: Spacing.sm,
      fontStyle: 'italic',
      color: theme.textMuted,
    },
    missingField: {
      color: theme.primary,
      textDecorationLine: 'underline',
    },
    hintContainer: {
      alignItems: 'center',
      paddingVertical: Spacing.md,
    },
    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.lg,
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.md,
    },
    finishButtonContainer: {
      padding: Spacing.lg,
    },
    finishButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.lg,
    },
    finishButtonText: {
      fontWeight: '600',
    },
    // Alert Modal 样式
    alertOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xl,
    },
    alertContent: {
      width: '100%',
      maxWidth: 400,
      padding: Spacing.xl,
      borderRadius: BorderRadius['4xl'],
      alignItems: 'center',
    },
    alertIconContainer: {
      marginBottom: Spacing.md,
    },
    alertTitle: {
      marginBottom: Spacing.sm,
      textAlign: 'center',
    },
    alertMessage: {
      marginBottom: Spacing.lg,
      textAlign: 'center',
      lineHeight: 22,
    },
    alertButton: {
      width: '100%',
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
    },
    alertButtons: {
      flexDirection: 'row',
      gap: Spacing.md,
      width: '100%',
    },
    alertButtonCancel: {
      flex: 1,
    },
    // Modal 样式
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.backgroundRoot,
      borderTopLeftRadius: BorderRadius['4xl'],
      borderTopRightRadius: BorderRadius['4xl'],
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    modalBody: {
      padding: Spacing.lg,
      maxHeight: 300,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: Spacing.md,
      padding: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    inputGroup: {
      marginBottom: Spacing.lg,
    },
    inputLabel: {
      marginBottom: Spacing.sm,
    },
    input: {
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    textArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    modalButton: {
      flex: 1,
      paddingVertical: Spacing.lg,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    submitButton: {
      borderWidth: 1,
      borderColor: theme.primary,
    },
  });
};
