import { Theme } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundRoot,
    },
    scrollContent: {
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textPrimary,
      marginBottom: 12,
    },
    card: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    label: {
      fontSize: 14,
      color: theme.textMuted,
    },
    value: {
      fontSize: 14,
      color: theme.textPrimary,
      fontWeight: '500',
    },
    input: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: theme.textPrimary,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
    },
    inputLabel: {
      fontSize: 14,
      color: theme.textPrimary,
      fontWeight: '500',
      marginBottom: 6,
    },
    pickerContainer: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
      overflow: 'hidden',
    },
    picker: {
      height: 50,
      color: theme.textPrimary,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonSecondary: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    buttonDanger: {
      backgroundColor: '#FF3B30',
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    buttonTextSecondary: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusActive: {
      backgroundColor: '#34C759',
    },
    statusInactive: {
      backgroundColor: theme.textMuted,
    },
    statusText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    warningCard: {
      backgroundColor: '#FFF3CD',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#FFD700',
    },
    warningTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#856404',
      marginBottom: 8,
    },
    warningText: {
      fontSize: 14,
      color: '#856404',
      lineHeight: 20,
    },
    tokenInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tokenLabel: {
      fontSize: 14,
      color: theme.textMuted,
    },
    tokenValue: {
      fontSize: 14,
      color: theme.textPrimary,
      fontWeight: '600',
    },
    emptyState: {
      alignItems: 'center',
      padding: 24,
    },
    emptyText: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 12,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 16,
    },
    helpText: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 4,
    },
    modelDescription: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      fontSize: 14,
      color: '#FF3B30',
      textAlign: 'center',
      marginTop: 8,
    },
    successText: {
      fontSize: 14,
      color: '#34C759',
      textAlign: 'center',
      marginTop: 8,
    },
  });
