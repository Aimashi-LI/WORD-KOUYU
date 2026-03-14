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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.lg,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    clearButton: {
      padding: Spacing.md,
    },
    infoCard: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.lg,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    infoIcon: {
      width: 24,
      textAlign: 'center',
    },
    infoContent: {
      flex: 1,
    },
    infoTitle: {
      marginBottom: Spacing.xs,
    },
    exampleText: {
      marginTop: Spacing.md,
      paddingLeft: 34,
      fontStyle: 'italic',
    },
    textareaContainer: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      minHeight: 200,
      marginBottom: Spacing.md,
    },
    textarea: {
      flex: 1,
      fontSize: 16,
      lineHeight: 24,
      minHeight: 200,
    },
    statsContainer: {
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    importButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.primary,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    importButtonDisabled: {
      opacity: 0.5,
    },
    importButtonIcon: {
      fontSize: 20,
    },
  });
};
