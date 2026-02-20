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
    // 统计卡片
    statsCard: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.lg,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.border,
    },
    // 词库切换栏
    wordbookBar: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.borderLight,
      marginBottom: Spacing.lg,
      paddingVertical: Spacing.sm,  // ✅ 新增：垂直内边距
      paddingHorizontal: Spacing.md,  // ✅ 新增：水平内边距
      gap: Spacing.sm,  // ✅ 新增：行与行之间的间距
    },
    wordbookBarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xs,  // ✅ 新增：与词库滚动区域的间距
    },
    wordbookScrollContainer: {
      flex: 1,
    },
    wordbookScroll: {
      // ✅ 移除 flex: 1，让 ScrollView 自适应宽度
    },
    wordbookScrollContent: {
      gap: Spacing.xs,
      paddingHorizontal: Spacing.xs,
    },
    wordbookChip: {
      paddingHorizontal: Spacing.xs,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    wordbookChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    addWordbookButton: {
      padding: Spacing.xs,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginBottom: Spacing.md,
    },
    brushWordsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.accent,
      marginBottom: Spacing.xl,
      shadowColor: theme.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    actionButton: {
      flex: 1,
      backgroundColor: theme.primary,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      gap: Spacing.xs,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    // 单词列表头部
    wordListHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    batchModeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
    },
    batchModeButtonText: {
      fontSize: 12,
    },
    // 批量操作按钮栏
    batchActionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      backgroundColor: `${theme.primary}10`,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.md,
      gap: Spacing.md,
    },
    batchActionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    selectedCount: {
      marginLeft: 'auto',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.primary,
    },
    // 单词卡片批量选择样式
    wordCardInSelectionMode: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    wordCardSelected: {
      borderWidth: 2,
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}05`,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    sectionTitle: {
      marginBottom: Spacing.md,
    },
    loadingContainer: {
      paddingVertical: Spacing.xl,
      alignItems: 'center',
      gap: Spacing.md,
    },
    loadingText: {
      marginTop: Spacing.sm,
    },
    emptyContainer: {
      paddingVertical: Spacing['3xl'],
      alignItems: 'center',
    },
    emptyText: {
      marginTop: Spacing.md,
      textAlign: 'center',
    },
    wordCard: {
      backgroundColor: theme.backgroundDefault,
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      position: 'relative', // 为绝对定位的徽章提供参考
    },
    masteredBadge: {
      position: 'absolute',
      top: Spacing.md,
      right: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: theme.success,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.full,
      zIndex: 10, // 确保徽章显示在最上层
    },
    masteredBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    wordHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    wordInfoLeft: {
      flex: 1,
    },
    wordbookTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    wordbookTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.sm,
      backgroundColor: `${theme.primary}15`,
    },
    wordbookTagText: {
      fontSize: 11,
    },
    addToBookButton: {
      padding: Spacing.xs,
    },
    mnemonicContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.sm,
      padding: Spacing.sm,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
    },
    mnemonicText: {
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
    batchActionModal: {
      marginHorizontal: Spacing.xl,
      marginBottom: Spacing.xl,
      borderRadius: BorderRadius.lg,
    },
    batchActionItems: {
      paddingVertical: Spacing.md,
    },
    batchActionOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
    },
    batchActionDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: Spacing.xs,
    },
    wordbookList: {
      gap: Spacing.sm,
    },
    wordbookListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
    },
    wordbookListItemContent: {
      flex: 1,
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
  });
};
