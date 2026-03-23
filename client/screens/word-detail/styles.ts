import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerButtons: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    inputContainer: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    label: {
      marginBottom: Spacing.xs,
      fontWeight: '500',
    },
    splitLabelContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: Spacing.xs,
    },
    phoneticButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    phoneticButtonText: {
      fontSize: 12,
    },
    input: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      fontSize: 16,
      color: theme.textPrimary,
      borderWidth: 1,
      borderColor: theme.border,
    },
    textArea: {
      minHeight: 60,
      textAlignVertical: 'top',
    },
    posScroll: {
      flexDirection: 'row',
      marginBottom: Spacing.sm,
    },
    posButton: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      marginRight: Spacing.sm,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.backgroundDefault,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    posButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    splitItemContainer: {
      marginBottom: Spacing.md,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
    },
    splitCodeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    splitCodeInput: {
      flex: 1,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.sm,
      padding: Spacing.sm,
      fontSize: 14,
      color: theme.textPrimary,
      borderWidth: 1,
      borderColor: theme.borderLight,
      minWidth: 80,
    },
    splitContentInput: {
      flex: 2,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.sm,
      padding: Spacing.sm,
      fontSize: 14,
      color: theme.textPrimary,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    removeButton: {
      width: 28,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addSplitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      padding: Spacing.sm,
      borderRadius: BorderRadius.sm,
      borderWidth: 1,
      borderColor: theme.primary,
      borderStyle: 'dashed',
      marginTop: Spacing.sm,
    },
    saveButton: {
      backgroundColor: theme.primary,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing['2xl'],
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      marginTop: Spacing.sm,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    splitItemView: {
      flexDirection: 'row',
      marginBottom: Spacing.sm,
    },
    splitCode: {
      fontWeight: '600',
      marginRight: Spacing.sm,
    },
    splitContent: {
      flex: 1,
    },
    undoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    undoText: {
      marginLeft: 4,
    },
    codeSuggestion: {
      flexDirection: 'row',
      backgroundColor: theme.backgroundRoot,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: BorderRadius.sm,
      padding: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    splitCharsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginTop: Spacing.sm,
      padding: Spacing.sm,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.sm,
    },
    splitCharButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.sm,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    autoCompleteToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    autoCompleteLabel: {
      fontSize: 12,
    },
    // 音标键盘 Modal 样式
    keyboardModalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'transparent',
    },
    keyboardCloseArea: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    keyboardDragHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.border,
      borderRadius: 2,
      marginBottom: Spacing.md,
    },
    keyboardContainer: {
      backgroundColor: theme.backgroundRoot,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing['2xl'],
      paddingTop: Spacing.md,
    },
    keyboardHideButton: {
      backgroundColor: theme.primary,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      marginTop: Spacing.sm,
    },
    // 查看模式样式
    headerActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xl,
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // AI 按钮样式
    aiButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: BorderRadius.sm,
      backgroundColor: theme.backgroundDefault,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    aiButtonText: {
      fontSize: 12,
    },
    labelRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    autoFillButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    helpText: {
      marginTop: Spacing.xs,
      fontStyle: 'italic',
    },
  });
};
