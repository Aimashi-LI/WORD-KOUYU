import { StyleSheet, Dimensions } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
      flex: 1,
      padding: Spacing.lg,
      justifyContent: 'center',
    },
    scrollContainer: {
      paddingHorizontal: 20, // 固定 20px padding，与 CARD_WIDTH 计算（SCREEN_WIDTH - 40）对应
      paddingVertical: Spacing.lg,
      flexGrow: 1,
    },
    cardWrapper: {
      marginRight: 20, // 固定 20px，与 CARD_SPACING 对应
    },
    wordCard: {
      padding: Spacing.xl,
      borderRadius: BorderRadius.xl,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8, // Android 阴影
      gap: Spacing.md,
    },
    wordPartOfSpeechRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      flexWrap: 'wrap',
    },
    wordInfoLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      flex: 1,
    },
    wordText: {
      textAlign: 'center',
    },
    inlinePartOfSpeech: {
      fontSize: 14,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      backgroundColor: `${theme.primary}15`,
      borderRadius: 8,
    },
    addPartOfSpeechButton: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      backgroundColor: `${theme.backgroundTertiary}`,
      borderRadius: 8,
    },
    addPartOfSpeechText: {
      fontSize: 14,
    },
    statusTags: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    // 已掌握标签
    masteredTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: BorderRadius.sm,
      backgroundColor: `${theme.success}15`,
    },
    masteredTagText: {
      fontSize: 11,
    },
    // 待编辑标签
    incompleteTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: BorderRadius.sm,
      backgroundColor: `${theme.warning}15`,
    },
    incompleteTagText: {
      fontSize: 11,
    },
    wordSection: {
      alignItems: 'center',
      gap: Spacing.sm,
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
    splitRow: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    splitLabel: {
      minWidth: 60,
    },
    splitValue: {
      flex: 1,
      textAlign: 'left',
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
    partOfSpeech: {
      marginBottom: Spacing.xs,
    },
    definitionSection: {
      gap: Spacing.md,
    },
    sentence: {
      marginTop: Spacing.sm,
      fontStyle: 'italic',
      color: theme.textMuted,
    },
    missingField: {
      color: theme.primary,
      textDecorationLine: 'underline',
    },
    hintContainer: {
      alignItems: 'center',
      paddingVertical: Spacing.md,
    },
    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.lg,
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.md,
    },
    finishButtonContainer: {
      padding: Spacing.lg,
    },
    finishButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.lg,
    },
    finishButtonText: {
      fontWeight: '600',
    },
    // Alert Modal 样式
    alertOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xl,
    },
    alertContent: {
      width: '100%',
      maxWidth: 400,
      padding: Spacing.xl,
      borderRadius: BorderRadius['4xl'],
      alignItems: 'center',
    },
    alertIconContainer: {
      marginBottom: Spacing.md,
    },
    alertTitle: {
      marginBottom: Spacing.sm,
      textAlign: 'center',
    },
    alertMessage: {
      marginBottom: Spacing.lg,
      textAlign: 'center',
      lineHeight: 22,
    },
    alertButton: {
      width: '100%',
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
    },
    alertButtons: {
      flexDirection: 'row',
      gap: Spacing.md,
      width: '100%',
    },
    alertButtonCancel: {
      flex: 1,
    },
    // Modal 样式
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.backgroundRoot,
      borderTopLeftRadius: BorderRadius['4xl'],
      borderTopRightRadius: BorderRadius['4xl'],
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    modalBody: {
      padding: Spacing.lg,
      maxHeight: 300,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: Spacing.md,
      padding: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    inputGroup: {
      marginBottom: Spacing.lg,
    },
    inputLabel: {
      marginBottom: Spacing.sm,
    },
    input: {
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    textArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    modalButton: {
      flex: 1,
      paddingVertical: Spacing.lg,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    submitButton: {
      borderWidth: 1,
      borderColor: theme.primary,
    },
    // 分享弹窗样式
    shareModalContent: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: theme.backgroundRoot,
      borderRadius: BorderRadius['2xl'],
      overflow: 'hidden',
    },
    shareModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    shareOptionsContainer: {
      padding: Spacing.md,
    },
    shareOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
      marginBottom: Spacing.md,
    },
    shareOptionIcon: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    shareOptionInfo: {
      flex: 1,
    },
    shareOptionTitle: {
      marginBottom: 4,
      fontWeight: '600',
    },
    shareOptionDesc: {
      fontSize: 12,
    },
    shareCancelButton: {
      padding: Spacing.md,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    // 分享卡片样式（暖橙色主题）
    shareCardContainer: {
      width: SCREEN_WIDTH - 40,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      borderWidth: 4,
      borderColor: '#F97316',
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      overflow: 'hidden',
    },
    // 单词容器
    shareWordContainer: {
      alignItems: 'center',
      marginBottom: 12,
    },
    shareWord: {
      fontSize: 48,
      fontWeight: 'bold',
      color: '#1F2937',
    },
    // 词性
    sharePartOfSpeechContainer: {
      alignItems: 'center',
      marginBottom: 8,
    },
    sharePartOfSpeech: {
      fontSize: 14,
      color: '#6B7280',
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: '#F3F4F6',
      borderRadius: 12,
    },
    // 橙色分隔线
    shareDivider: {
      width: '80%',
      height: 2,
      backgroundColor: '#F97316',
      alignSelf: 'center',
      marginBottom: 16,
    },
    // 释义
    shareDefinitionSection: {
      backgroundColor: '#F3F4F6',
      padding: 12,
      borderRadius: 12,
      marginBottom: 12,
    },
    shareLabelRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    shareDefinitionLabel: {
      fontSize: 14,
      color: '#9CA3AF',
      minWidth: 45,
      flexShrink: 0,
    },
    shareDefinition: {
      fontSize: 16,
      color: '#1F2937',
      lineHeight: 22,
      flex: 1,
    },
    // 拆分
    shareSplitSection: {
      backgroundColor: '#DBEAFE',
      padding: 12,
      borderRadius: 12,
      marginBottom: 12,
    },
    shareSectionTitle: {
      fontSize: 12,
      color: '#9CA3AF',
      marginBottom: 8,
    },
    shareSplitTextContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    shareSplitColumn: {
      flexDirection: 'column',
      gap: 4,
    },
    shareSplitColumnWithSpacing: {
      paddingRight: 20,
    },
    shareSplitDivider: {
      width: 1,
      backgroundColor: 'rgba(59, 130, 246, 0.3)',
      marginHorizontal: 10,
      flexShrink: 0,
    },
    shareSplitItem: {
      fontSize: 14,
      color: '#1F2937',
      lineHeight: 20,
    },
    shareSplitItemSmall: {
      fontSize: 12,
      lineHeight: 16,
    },
    // 助记短句
    shareMnemonicSection: {
      backgroundColor: '#FEF3C7',
      padding: 12,
      borderRadius: 12,
      marginBottom: 12,
    },
    shareMnemonicLabel: {
      fontSize: 14,
      color: '#9CA3AF',
      minWidth: 45,
      flexShrink: 0,
    },
    shareMnemonicText: {
      fontSize: 16,
      color: '#F97316',
      lineHeight: 22,
      flex: 1,
    },
    // 例句
    shareSentenceSection: {
      backgroundColor: '#F3F4F6',
      padding: 12,
      borderRadius: 12,
      marginBottom: 12,
    },
    shareSentenceLabel: {
      fontSize: 14,
      color: '#9CA3AF',
      minWidth: 45,
      flexShrink: 0,
    },
    shareSentenceText: {
      fontSize: 16,
      color: '#374151',
      lineHeight: 22,
      flex: 1,
    },
    // 底部信息
    shareCardFooter: {
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 32,
    },
    shareFooterUser: {
      fontSize: 10,
      color: '#6B7280',
      marginBottom: 2,
    },
    shareFooterDate: {
      fontSize: 10,
      color: '#6B7280',
    },
  });
};
