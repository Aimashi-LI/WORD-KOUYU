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
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.lg,
    },
    backButton: {
      padding: Spacing.md,
      marginLeft: -Spacing.md,
    },
    placeholder: {
      width: 40,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Spacing.xl,
    },
    iconContainer: {
      marginBottom: Spacing.xl,
    },
    title: {
      marginBottom: Spacing.md,
      textAlign: 'center',
    },
    description: {
      textAlign: 'center',
      lineHeight: 24,
    },
  });
};
