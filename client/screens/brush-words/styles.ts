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
      flexGrow: 1,
      padding: Spacing.lg,
      justifyContent: 'center',
    },
    wordCard: {
      padding: Spacing.xl,
      borderRadius: BorderRadius.xl,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      gap: Spacing.lg,
    },
    wordSection: {
      alignItems: 'center',
      gap: Spacing.sm,
    },
    wordText: {
      textAlign: 'center',
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
    splitText: {
      flex: 1,
      textAlign: 'center',
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
    definitionSection: {
      gap: Spacing.md,
    },
    definitionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    definitionTitle: {
      fontWeight: '600',
    },
    definitionContent: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.md,
      gap: Spacing.sm,
    },
    sentence: {
      marginTop: Spacing.sm,
      fontStyle: 'italic',
    },
    bottomBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    navButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.lg,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.backgroundDefault,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    navButtonDisabled: {
      opacity: 0.5,
    },
  });
};
