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
      padding: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    backButton: {
      padding: Spacing.sm,
    },
    placeholder: {
      width: 32,
    },
    content: {
      flex: 1,
      padding: Spacing.lg,
    },
    card: {
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
    icon: {
      marginBottom: Spacing.lg,
    },
    cardTitle: {
      marginBottom: Spacing.sm,
    },
    cardText: {
      marginBottom: Spacing.lg,
      textAlign: 'center',
    },
    importButton: {
      backgroundColor: theme.primary,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.lg,
      minWidth: 120,
      alignItems: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    infoCard: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
    },
    infoTitle: {
      marginBottom: Spacing.md,
    },
    infoSubtitle: {
      marginTop: Spacing.md,
      marginBottom: Spacing.xs,
    },
    infoText: {
      lineHeight: 20,
    },
    marginTop: {
      marginTop: Spacing.lg,
    },
  });
};
