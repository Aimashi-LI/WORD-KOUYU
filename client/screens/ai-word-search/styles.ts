import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundRoot,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing['2xl'],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.lg,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      flex: 1,
      textAlign: 'center',
    },
    placeholder: {
      width: 40,
    },
    searchSection: {
      marginBottom: Spacing.lg,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.md,
    },
    searchInputIcon: {
      marginRight: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: Spacing.md,
      fontSize: 16,
      color: theme.textPrimary,
    },
    searchButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      gap: Spacing.sm,
    },
    searchButtonDisabled: {
      opacity: 0.6,
    },
    searchButtonText: {
      color: theme.buttonPrimaryText,
      fontSize: 16,
      fontWeight: '600',
    },
    hintText: {
      marginTop: Spacing.sm,
      textAlign: 'center',
    },
    countInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    countInput: {
      width: 60,
      height: 36,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: Spacing.sm,
      textAlign: 'center',
      fontSize: 16,
      color: theme.textPrimary,
      marginHorizontal: Spacing.xs,
    },
    resultsSection: {
      flex: 1,
    },
    resultsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
      paddingBottom: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    resultsCount: {
      fontWeight: '500',
    },
    selectAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    wordCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    wordCardSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.backgroundTertiary,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: BorderRadius.sm,
      borderWidth: 2,
      borderColor: theme.border,
      marginRight: Spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    wordInfo: {
      flex: 1,
    },
    wordText: {
      fontWeight: '600',
      marginBottom: 2,
    },
    phoneticText: {
      marginBottom: 2,
    },
    definitionText: {
      flexWrap: 'wrap',
    },
    exampleContainer: {
      marginTop: 4,
    },
    exampleText: {
      marginTop: 2,
      fontStyle: 'italic',
      flexWrap: 'wrap',
    },
    limitTipCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      gap: Spacing.sm,
    },
    limitTipText: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Spacing['3xl'],
    },
    loadingText: {
      marginTop: Spacing.md,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Spacing['3xl'],
    },
    emptyText: {
      marginTop: Spacing.md,
      textAlign: 'center',
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.backgroundDefault,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      paddingBottom: Spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectedCount: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.md,
      gap: Spacing.sm,
    },
    addButtonDisabled: {
      opacity: 0.5,
    },
    addButtonText: {
      color: theme.buttonPrimaryText,
      fontSize: 16,
      fontWeight: '600',
    },
    descriptionCard: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    descriptionText: {
      fontStyle: 'italic',
    },
    errorContainer: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: theme.error,
    },
    errorText: {
      color: theme.error,
      textAlign: 'center',
    },
    configPrompt: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Spacing['3xl'],
      paddingHorizontal: Spacing.xl,
    },
    configPromptIcon: {
      marginBottom: Spacing.lg,
    },
    configPromptTitle: {
      marginBottom: Spacing.sm,
      textAlign: 'center',
    },
    configPromptText: {
      textAlign: 'center',
      marginBottom: Spacing.lg,
    },
    configButton: {
      backgroundColor: theme.primary,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.md,
    },
    configButtonText: {
      color: theme.buttonPrimaryText,
      fontSize: 16,
      fontWeight: '600',
    },
  });
};
