import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.backgroundRoot,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  // 智能推荐卡片
  recommendationCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  recommendationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recommendationTextContainer: {
    flex: 1,
  },
  predictionNoticeContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  predictionNoticeText: {
    lineHeight: 20,
  },
  // 视图切换
  viewToggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: 8,
    padding: 4,
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 8,
  },
  // 滚动内容
  scrollContent: {
    flex: 1,
    marginTop: 16,
  },
  // 日历容器
  calendarContainer: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    backgroundColor: theme.backgroundDefault,
  },
  // 月份导航
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  // 星期标题
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  // 日期网格
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 8,
  },
  dayCellSelected: {
    backgroundColor: theme.primary,
  },
  dayCellEmpty: {
    backgroundColor: 'transparent',
  },
  dayNumber: {
    fontSize: 16,
  },
  dayNumberToday: {
    fontWeight: 'bold',
  },
  dayDot: {
    marginTop: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // 选中日期的统计
  selectedDayStats: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  selectedDayTitle: {
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.border,
    height: 40,
  },
  // 待复习单词列表
  pendingWordsContainer: {
    marginTop: 16,
  },
  pendingWordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pendingWordsTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  earlyReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  earlyReviewButtonText: {
    fontSize: 12,
  },
  pendingWordItem: {
    padding: 12,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: theme.backgroundTertiary,
  },
  pendingWordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingWordLeft: {
    flex: 1,
  },
  pendingWord: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  expandIcon: {
    transitionDuration: '0.2s',
  },
  pendingWordDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  wordDetailRow: {
    marginBottom: 8,
  },
  wordDetailLabel: {
    marginBottom: 2,
  },
  // 没有复习项目提示
  noReviewItemsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  noReviewItemsText: {
    fontSize: 14,
  },
  // 完成率
  completionRateContainer: {
    paddingHorizontal: 16,
  },
  progressBarContainer: {
    marginTop: 8,
    height: 6,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  // 列表容器
  listContainer: {
    paddingHorizontal: 16,
  },
  // 天数切换
  daysToggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.backgroundTertiary,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  daysToggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  // 日期卡片
  dayCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  // 空状态
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  // 弹窗
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
  // 开关
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.backgroundTertiary,
    padding: 2,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.backgroundDefault,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  // 时间输入
  timeInputContainer: {
    marginBottom: 16,
  },
  wheelPickerContainer: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 16,
    backgroundColor: theme.backgroundDefault,
    borderRadius: 12,
    padding: 16,
  },
  wheelPickerWrapper: {
    flex: 1,
    height: 150,
  },
  selectedTimeDisplay: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedTimeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  // 历史统计
  historyStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  historyStatItem: {
    alignItems: 'center',
  },
  // 提前复习警告样式
  warningContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  warningTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  warningText: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
