import { StyleSheet, Platform } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
      padding: Spacing.xl,
      paddingTop: Spacing['3xl'],
    },
    headerSection: {
      alignItems: 'center',
      marginBottom: Spacing['3xl'],
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    appTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: Spacing.xs,
      textAlign: 'center',
    },
    appVersion: {
      fontSize: 14,
      marginBottom: Spacing.sm,
    },
    truthTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    tagIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    tagText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
    },
    fullTextContainer: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing['3xl'],
    },
    fullText: {
      fontSize: 15,
      lineHeight: 24,
      color: theme.textPrimary,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    closeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing['2xl'],
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
    },
    closeButtonText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: Spacing.sm,
    },
    hintText: {
      textAlign: 'center',
      fontSize: 13,
    },
  });
};
