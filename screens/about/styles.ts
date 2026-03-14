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
    contactInfo: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
    },
    contactLabel: {
      marginBottom: Spacing.md,
      lineHeight: 22,
    },
    emailContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
    },
    emailIcon: {
      marginRight: Spacing.md,
    },
    emailText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
    },
    copyHint: {
      marginTop: Spacing.sm,
      textAlign: 'center',
      fontStyle: 'italic',
      opacity: 0.7,
    },
    developerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.sm,
    },
    optionIcon: {
      marginRight: Spacing.md,
    },
    optionText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
    },
    developerHint: {
      marginTop: Spacing.sm,
      fontStyle: 'italic',
      opacity: 0.6,
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
      position: 'absolute',
      top: Spacing['3xl'],
      left: Spacing.lg,
      right: Spacing.lg,
      bottom: Spacing.lg,
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
    },
    modalBodyContent: {
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
