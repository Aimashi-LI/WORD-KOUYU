import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import RNSSE from 'react-native-sse';
import { useAI } from '@/hooks/useAI';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  corrections?: {
    grammar?: string;
    vocabulary?: string;
    pronunciation?: string;
    expression?: string;
    feedback?: string;
  };
}

interface Scene {
  id: string;
  name: string;
  greeting: string;
  category?: string;
}

type SpeakingMode = 'select' | 'chat';

// 实时对话状态
type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking';

export default function SpeakingScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [mode, setMode] = useState<SpeakingMode>('select');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  
  // 实时对话状态
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  
  // 音频相关
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const sseRef = useRef<RNSSE | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { isConfigured, openSettings, refresh } = useAI();

  // 脉冲动画
  useEffect(() => {
    if (conversationState === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [conversationState]);

  // 清理所有资源
  const cleanupResources = useCallback(async () => {
    try {
      // 停止并卸载录音
      if (recordingRef.current) {
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording) {
            await recordingRef.current.stopAndUnloadAsync();
          }
        } catch (e) {
          // 忽略已卸载的错误
        }
        recordingRef.current = null;
      }

      // 卸载音频
      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } catch (e) {
          // 忽略错误
        }
        soundRef.current = null;
      }

      // 关闭SSE连接
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  // 加载场景列表和刷新AI配置
  useFocusEffect(
    useCallback(() => {
      loadScenes();
      refresh(); // 刷新AI配置状态
    }, [refresh])
  );

  const loadScenes = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/speaking/scenes`);
      const data = await response.json();
      if (data.success && data.data) {
        setScenes(data.data);
      }
    } catch (error) {
      console.error('Load scenes error:', error);
    }
  };

  // 解析纠正信息
  const parseCorrections = (content: string): { mainContent: string; corrections?: Message['corrections'] } => {
    const hasCorrectionMarker = content.includes('📝 **Corrections**') || 
                                 content.includes('📝**Corrections**') ||
                                 content.includes('**Corrections**:') ||
                                 content.includes('🎯 **Interview Feedback**');

    if (!hasCorrectionMarker) {
      const inlineCorrectionPatterns = [
        /By the way, we (?:usually |often |)say ['"]([^'"]+)['"] instead of ['"]([^'"]+)['"]/i,
        /we'd say ['"]([^'"]+)['"] instead of ['"]([^'"]+)['"]/i,
        /Instead of ['"]([^'"]+)['"][,，] (?:you could |try |)say ['"]([^'"]+)['"]/i,
        /['"]([^'"]+)['"] (?:is pronounced |sounds )like ['"]([^'"]+)['"]/i,
      ];

      const corrections: Message['corrections'] = {};
      let hasInlineCorrection = false;

      inlineCorrectionPatterns.forEach((pattern, index) => {
        const match = content.match(pattern);
        if (match) {
          hasInlineCorrection = true;
          if (index < 2) {
            corrections.grammar = `Should say: "${match[1]}" instead of "${match[2]}"`;
          } else if (index === 2) {
            corrections.expression = `Try: "${match[2]}" instead of "${match[1]}"`;
          } else {
            corrections.pronunciation = `"${match[1]}" sounds like "${match[2]}"`;
          }
        }
      });

      if (hasInlineCorrection) {
        return { mainContent: content, corrections };
      }
      return { mainContent: content };
    }

    const parts = content.split(/📝\s*\*?\*?Corrections\*?\*?:?|🎯\s*\*?\*?Interview Feedback\*?\*?:?/i);
    const mainContent = parts[0].trim();
    const corrections: Message['corrections'] = {};
    
    if (parts[1]) {
      const correctionText = parts[1];
      const grammarMatch = correctionText.match(/\*?\*?Grammar\*?\*?:?\s*([^\n*]+)/i);
      if (grammarMatch) corrections.grammar = grammarMatch[1].trim();
      
      const vocabMatch = correctionText.match(/\*?\*?Vocabulary\*?\*?:?\s*([^\n*]+)/i);
      if (vocabMatch) corrections.vocabulary = vocabMatch[1].trim();
      
      const pronMatch = correctionText.match(/\*?\*?Pronunciation\*?\*?:?\s*([^\n*]+)/i);
      if (pronMatch) corrections.pronunciation = pronMatch[1].trim();
      
      const exprMatch = correctionText.match(/\*?\*?Natural Expression\*?\*?:?\s*([^\n*]+)/i) ||
                        correctionText.match(/\*?\*?Better Phrases\*?\*?:?\s*([^\n*]+)/i);
      if (exprMatch) corrections.expression = exprMatch[1].trim();
      
      const feedbackMatch = correctionText.match(/\*?\*?Keep practicing!\*?\*?\s*([^\n*]+)/i) ||
                            correctionText.match(/\*?\*?Tip\*?\*?:?\s*([^\n*]+)/i);
      if (feedbackMatch) corrections.feedback = feedbackMatch[1].trim();
    }

    return { mainContent, corrections };
  };

  // 开始对话
  const startChat = async (scene: Scene) => {
    if (!isConfigured) {
      Alert.alert('提示', '请先配置 AI API 密钥', [
        { text: '取消', style: 'cancel' },
        { text: '去配置', onPress: openSettings },
      ]);
      return;
    }

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/speaking/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId: scene.id }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setSelectedScene(scene);
        setSystemPrompt(data.data.systemPrompt);
        setMessages([{
          id: Date.now().toString(),
          role: 'assistant',
          content: data.data.greeting,
          timestamp: new Date(),
        }]);
        setMode('chat');
        setConversationState('idle');
        
        // 播放欢迎语后自动开始监听
        await playTTS(data.data.greeting, true);
      }
    } catch (error: any) {
      Alert.alert('错误', error.message || '启动对话失败');
    }
  };

  // 播放TTS
  const playTTS = async (text: string, autoStartListening: boolean = false) => {
    try {
      setConversationState('speaking');
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/audio/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.audioUri) {
        // 卸载之前的音频
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }
        
        // 播放新音频
        const { sound } = await Audio.Sound.createAsync(
          { uri: data.data.audioUri },
          { shouldPlay: true }
        );
        
        soundRef.current = sound;
        
        // 监听播放完成
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            if (autoStartListening) {
              startListening();
            } else {
              setConversationState('idle');
            }
          }
        });
      } else {
        setConversationState('idle');
      }
    } catch (error) {
      console.error('TTS error:', error);
      setConversationState('idle');
    }
  };

  // 开始监听（录音）
  const startListening = async () => {
    try {
      // 确保之前的录音已清理
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {
          // 忽略
        }
        recordingRef.current = null;
      }

      // 请求麦克风权限
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '需要麦克风权限才能录音');
        setConversationState('idle');
        return;
      }

      // 设置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 停止当前播放的音频
      if (soundRef.current) {
        await soundRef.current.stopAsync();
      }

      // 开始录音
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      setIsRecording(true);
      setConversationState('listening');
    } catch (error: any) {
      console.error('Start listening error:', error);
      Alert.alert('错误', '录音启动失败');
      setConversationState('idle');
    }
  };

  // 停止监听并处理
  const stopListening = async () => {
    if (!recordingRef.current) return;

    try {
      setIsRecording(false);
      setConversationState('processing');
      
      const recording = recordingRef.current;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      if (!uri) {
        setConversationState('idle');
        return;
      }

      // 读取音频并转base64
      const audioBase64 = await (FileSystem as any).readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // 语音识别
      const asrResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/audio/asr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data: audioBase64 }),
      });
      
      const asrData = await asrResponse.json();
      
      if (asrData.success && asrData.data?.text) {
        const recognizedText = asrData.data.text.trim();
        if (recognizedText) {
          // 添加用户消息
          const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: recognizedText,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, userMessage]);
          
          // 发送给AI
          await sendToAI(recognizedText);
        } else {
          setConversationState('idle');
        }
      } else {
        setConversationState('idle');
      }
    } catch (error: any) {
      console.error('Stop listening error:', error);
      setConversationState('idle');
    }
  };

  // 发送给AI
  const sendToAI = async (userText: string) => {
    // 关闭之前的SSE连接
    if (sseRef.current) {
      sseRef.current.close();
    }

    try {
      const url = `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/speaking/chat`;
      
      // 获取当前消息列表（不包括刚添加的用户消息，因为会在下面添加）
      const currentMessages = messages.slice();
      
      sseRef.current = new RNSSE(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...currentMessages, { role: 'user', content: userText }].map(m => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt,
        }),
      });

      let fullResponse = '';

      sseRef.current.addEventListener('message', (event: any) => {
        if (event.data === '[DONE]') {
          const { mainContent, corrections } = parseCorrections(fullResponse);
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: mainContent,
            timestamp: new Date(),
            corrections,
          };
          
          setMessages(prev => [...prev, assistantMessage]);
          setCurrentResponse('');
          
          // 播放回复并自动继续监听
          playTTS(mainContent, true);
          return;
        }

        try {
          const parsed = JSON.parse(event.data);
          if (parsed.content) {
            fullResponse += parsed.content;
            setCurrentResponse(fullResponse);
          }
        } catch (e) {
          // 忽略解析错误
        }
      });

      sseRef.current.addEventListener('error', (error: any) => {
        console.error('SSE error:', error);
        setConversationState('idle');
      });

    } catch (error: any) {
      console.error('Send to AI error:', error);
      setConversationState('idle');
    }
  };

  // 打断AI说话
  const interruptSpeaking = async () => {
    if (soundRef.current && conversationState === 'speaking') {
      await soundRef.current.stopAsync();
      setConversationState('idle');
    }
  };

  // 主按钮点击处理
  const handleMainButtonPress = () => {
    switch (conversationState) {
      case 'idle':
        startListening();
        break;
      case 'listening':
        stopListening();
        break;
      case 'speaking':
        interruptSpeaking();
        break;
      case 'processing':
        // 处理中，不做任何操作
        break;
    }
  };

  // 结束对话
  const handleEndChat = () => {
    Alert.alert('结束对话', '确定要结束本次口语训练吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: async () => {
          await cleanupResources();
          setMessages([]);
          setSelectedScene(null);
          setMode('select');
          setConversationState('idle');
        },
      },
    ]);
  };

  // 按类别分组场景
  const groupedScenes = useMemo(() => {
    const groups: { [key: string]: Scene[] } = {
      '生活角色': [],
      '母语环境': [],
      '专业场景': [],
    };
    
    scenes.forEach(scene => {
      if (['friend', 'teacher', 'family', 'colleague'].includes(scene.id)) {
        groups['生活角色'].push(scene);
      } else if (['native_american', 'native_british'].includes(scene.id)) {
        groups['母语环境'].push(scene);
      } else {
        groups['专业场景'].push(scene);
      }
    });
    
    return groups;
  }, [scenes]);

  // 获取按钮配置
  const getButtonConfig = () => {
    switch (conversationState) {
      case 'idle':
        return { icon: 'microphone', color: theme.primary, label: '点击开始说话' };
      case 'listening':
        return { icon: 'stop', color: theme.error, label: '点击停止' };
      case 'speaking':
        return { icon: 'hand', color: theme.warning, label: '点击打断' };
      case 'processing':
        return { icon: 'spinner', color: theme.textMuted, label: '处理中...' };
    }
  };

  const buttonConfig = getButtonConfig();

  const renderSelectMode = () => (
    <View style={styles.selectContainer}>
      <View style={styles.headerSection}>
        <FontAwesome6 name="comments" size={40} color={theme.primary} />
        <ThemedText variant="h2" color={theme.textPrimary} style={styles.title}>
          口语训练
        </ThemedText>
        <ThemedText variant="body" color={theme.textMuted} style={styles.subtitle}>
          选择角色开始实时语音对话
        </ThemedText>
      </View>

      <ScrollView style={styles.scenesList} showsVerticalScrollIndicator={false}>
        {Object.entries(groupedScenes).map(([category, categoryScenes]) => (
          categoryScenes.length > 0 && (
            <View key={category} style={styles.categorySection}>
              <ThemedText variant="h4" color={theme.textSecondary} style={styles.categoryTitle}>
                {category}
              </ThemedText>
              <View style={styles.sceneGrid}>
                {categoryScenes.map(scene => (
                  <TouchableOpacity
                    key={scene.id}
                    style={styles.sceneCard}
                    onPress={() => startChat(scene)}
                    activeOpacity={0.7}
                  >
                    <ThemedText variant="h4" color={theme.textPrimary} style={styles.sceneName}>
                      {scene.name}
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.textMuted} style={styles.sceneGreeting} numberOfLines={2}>
                      "{scene.greeting}"
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )
        ))}
      </ScrollView>

      {!isConfigured && (
        <TouchableOpacity style={styles.configButton} onPress={openSettings}>
          <FontAwesome6 name="gear" size={18} color={theme.buttonPrimaryText} />
          <ThemedText variant="body" color={theme.buttonPrimaryText}>
            配置 AI API 密钥
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderChatMode = () => (
    <View style={styles.chatContainer}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={handleEndChat} style={styles.backButton}>
          <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.chatTitleContainer}>
          <ThemedText variant="h4" color={theme.textPrimary}>
            {selectedScene?.name}
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted}>
            {buttonConfig.label}
          </ThemedText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map(message => (
          <View key={message.id} style={styles.messageWrapper}>
            <View
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <ThemedText
                variant="body"
                color={message.role === 'user' ? theme.buttonPrimaryText : theme.textPrimary}
                style={styles.messageText}
              >
                {message.content}
              </ThemedText>
            </View>
            
            {/* 纠正信息 */}
            {message.role === 'assistant' && message.corrections && (
              <View style={styles.correctionsContainer}>
                <View style={styles.correctionsHeader}>
                  <FontAwesome6 name="lightbulb" size={14} color={theme.warning} />
                  <ThemedText variant="caption" color={theme.warning} style={styles.correctionsTitle}>
                    学习要点
                  </ThemedText>
                </View>
                
                {message.corrections.grammar && (
                  <View style={styles.correctionItem}>
                    <FontAwesome6 name="spell-check" size={12} color={theme.primary} />
                    <Text style={[styles.correctionText, { color: theme.textSecondary }]}>
                      <Text style={{ fontWeight: '600', color: theme.textPrimary }}>语法: </Text>
                      {message.corrections.grammar}
                    </Text>
                  </View>
                )}
                
                {message.corrections.vocabulary && (
                  <View style={styles.correctionItem}>
                    <FontAwesome6 name="book" size={12} color={theme.primary} />
                    <Text style={[styles.correctionText, { color: theme.textSecondary }]}>
                      <Text style={{ fontWeight: '600', color: theme.textPrimary }}>词汇: </Text>
                      {message.corrections.vocabulary}
                    </Text>
                  </View>
                )}
                
                {message.corrections.pronunciation && (
                  <View style={styles.correctionItem}>
                    <FontAwesome6 name="volume-high" size={12} color={theme.primary} />
                    <Text style={[styles.correctionText, { color: theme.textSecondary }]}>
                      <Text style={{ fontWeight: '600', color: theme.textPrimary }}>发音: </Text>
                      {message.corrections.pronunciation}
                    </Text>
                  </View>
                )}
                
                {message.corrections.expression && (
                  <View style={styles.correctionItem}>
                    <FontAwesome6 name="comment-dots" size={12} color={theme.primary} />
                    <Text style={[styles.correctionText, { color: theme.textSecondary }]}>
                      <Text style={{ fontWeight: '600', color: theme.textPrimary }}>表达: </Text>
                      {message.corrections.expression}
                    </Text>
                  </View>
                )}
                
                {message.corrections.feedback && (
                  <View style={styles.feedbackItem}>
                    <FontAwesome6 name="star" size={12} color={theme.success} />
                    <Text style={[styles.feedbackText, { color: theme.success }]}>
                      {message.corrections.feedback}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}

        {/* AI正在生成 */}
        {currentResponse && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <ThemedText variant="body" color={theme.textPrimary} style={styles.messageText}>
              {currentResponse}
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* 实时对话按钮 */}
      <View style={styles.voiceControlContainer}>
        <TouchableOpacity
          style={[
            styles.mainButton,
            { backgroundColor: buttonConfig.color },
            conversationState === 'listening' && styles.listeningButton,
          ]}
          onPress={handleMainButtonPress}
          disabled={conversationState === 'processing'}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            {conversationState === 'processing' ? (
              <ActivityIndicator size="large" color={theme.buttonPrimaryText} />
            ) : (
              <FontAwesome6
                name={buttonConfig.icon}
                size={32}
                color={theme.buttonPrimaryText}
              />
            )}
          </Animated.View>
        </TouchableOpacity>
        
        <ThemedText variant="caption" color={theme.textMuted} style={styles.buttonLabel}>
          {buttonConfig.label}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      {mode === 'select' && renderSelectMode()}
      {mode === 'chat' && renderChatMode()}
    </Screen>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
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
  messageWrapper: {
    marginBottom: 12,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 18,
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
  correctionsContainer: {
    marginTop: 8,
    marginLeft: 4,
    padding: 12,
    backgroundColor: '#FFF9E6',
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
    fontSize: 13,
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
    fontSize: 13,
  },

  // ===== 实时语音控制 =====
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
});
