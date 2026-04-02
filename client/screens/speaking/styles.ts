import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const createStyles = (theme: any) => StyleSheet.create({
  // ===== 选择模式样式 =====
  selectContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  title: {
    marginTop: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  scenesList: {
    flex: 1,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sceneGrid: {
    gap: 12,
  },
  sceneCard: {
    backgroundColor: theme.backgroundDefault,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sceneName: {
    marginBottom: 8,
  },
  sceneGreeting: {
    fontStyle: 'italic',
    lineHeight: 20,
  },
  configButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: theme.primary,
    borderRadius: 12,
    marginBottom: 24,
  },

  // ===== 聊天模式样式 =====
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.backgroundRoot,
  },
  backButton: {
    padding: 8,
  },
  chatTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.backgroundDefault,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  messageText: {
    lineHeight: 22,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  correctionsContainer: {
    marginTop: 8,
    marginLeft: 4,
    padding: 12,
    backgroundColor: theme.warningBackground || '#FFF9E6',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.warning,
  },
  correctionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  correctionsTitle: {
    fontWeight: '600',
  },
  correctionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  correctionText: {
    flex: 1,
    lineHeight: 20,
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 8,
  },
  feedbackText: {
    flex: 1,
    fontWeight: '500',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.backgroundRoot,
    gap: 10,
  },
  recordButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.backgroundDefault,
    borderWidth: 1,
    borderColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: theme.error,
    borderColor: theme.error,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  textInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: theme.backgroundDefault,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.textPrimary,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.backgroundTertiary,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.backgroundRoot + 'CC',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  processingText: {
    marginTop: 8,
  },
  // 实时语音控制
  voiceControlContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: theme.backgroundRoot,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  mainButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  listeningButton: {
    shadowColor: theme.error,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonLabel: {
    textAlign: 'center',
  },
  // 发音确认样式
  pronunciationCheckContainer: {
    marginTop: 8,
    paddingVertical: 8,
  },
  pronunciationCheckButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmYes: {
    backgroundColor: theme.primary,
  },
  confirmNo: {
    backgroundColor: theme.backgroundTertiary,
    borderWidth: 1,
    borderColor: theme.border,
  },
  // 发音纠正样式
  pronunciationCorrectionContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: 12,
    alignItems: 'center',
  },
  pronunciationWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pronunciationWord: {
    fontWeight: '700',
  },
  playPronunciationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.backgroundDefault,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.primary,
  },
  phoneticText: {
    marginTop: 8,
    fontSize: 16,
    fontStyle: 'italic',
  },
  pronunciationHint: {
    marginTop: 4,
  },
});
