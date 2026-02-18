import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    reviewContainer: {
      flex: 1,
      padding: Spacing.lg,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginBottom: Spacing.md,
    },
    backButton: {
      padding: Spacing.sm,
    },
    progressContainer: {
      marginBottom: Spacing.xl,
    },
    progressBar: {
      height: 6,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: 3,
      marginTop: Spacing.xs,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    wordDisplay: {
      padding: Spacing.xl,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      marginBottom: Spacing.xl,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    mnemonicDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.lg,
    },
    definitionDisplay: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.xl,
    },
    partOfSpeech: {
      marginBottom: Spacing.xs,
    },
    sentence: {
      marginTop: Spacing.sm,
      fontStyle: 'italic',
      lineHeight: 18,
    },
    scoreButtons: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: Spacing.md,
      marginBottom: Spacing.md,
    },
    scoreButton: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    scoreHint: {
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: Spacing.md,
    },
    loadingText: {
      marginTop: Spacing.md,
    },
    completedContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xl,
    },
    completedTitle: {
      marginTop: Spacing.xl,
      marginBottom: Spacing.lg,
    },
    rating: {
      marginBottom: Spacing.xl,
    },
    statsRow: {
      flexDirection: 'row',
      gap: Spacing.xl,
      marginBottom: Spacing.md,
    },
    masteredBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.lg,
      borderWidth: 2,
      borderColor: theme.success,
    },
    masteredBannerContent: {
      flex: 1,
    },
    masteredTitle: {
      marginBottom: Spacing.xs,
    },
    masteredWordsList: {
      width: '100%',
      maxHeight: 200,
      marginBottom: Spacing.xl,
    },
    masteredListHeader: {
      marginBottom: Spacing.sm,
      textAlign: 'center',
    },
    masteredWordItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.sm,
    },
    masteredWordInfo: {
      flex: 1,
    },
    completeButton: {
      backgroundColor: theme.primary,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing['2xl'],
      borderRadius: BorderRadius.lg,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
  });
};
