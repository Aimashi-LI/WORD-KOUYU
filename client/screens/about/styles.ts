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
      alignItems: 'center',
      marginBottom: Spacing['2xl'],
    },
    icon: {
      width: 80,
      height: 80,
      borderRadius: 20,
      marginBottom: Spacing.lg,
    },
    appName: {
      marginBottom: Spacing.sm,
    },
    version: {
      marginBottom: Spacing.lg,
    },
    description: {
      textAlign: 'center',
      marginBottom: Spacing['2xl'],
    },
    section: {
      marginBottom: Spacing.xl,
    },
    sectionTitle: {
      marginBottom: Spacing.md,
    },
    legalSection: {
      marginBottom: Spacing.lg,
    },
    linkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.sm,
    },
    linkContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    linkIcon: {
      marginRight: Spacing.md,
    },
    linkArrow: {
      marginLeft: Spacing.md,
    },
    infoSection: {
      marginBottom: Spacing.md,
    },
    infoItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    infoLabel: {
      flex: 1,
    },
    infoValue: {
      marginLeft: Spacing.md,
    },
    footer: {
      alignItems: 'center',
      marginTop: Spacing['2xl'],
      paddingTop: Spacing.xl,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    footerText: {
      marginBottom: Spacing.sm,
    },
    copyright: {
      marginBottom: Spacing.xl,
    },
    modalContent: {
      flex: 1,
      margin: Spacing.lg,
      marginTop: Spacing['3xl'],
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
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
      flex: 1,
      padding: Spacing.lg,
    },
    docText: {
      lineHeight: 24,
    },
    modalFooter: {
      padding: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    modalButton: {
      backgroundColor: theme.primary,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
    },
  });
};
