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
  Modal,
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
import { createStyles } from './styles';

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
  // 发音确认请求
  pronunciationCheck?: {
    correctWord: string;
    wrongWord: string;
  };
  // 发音纠正信息
  pronunciationCorrection?: {
    word: string;
    phonetic: string;
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
  
  // 权限告知弹窗
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  
  // 音频相关
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const sseRef = useRef<RNSSE | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // 防止重复播放和重复请求
  const isPlayingRef = useRef(false);
  const isRequestingRef = useRef(false);
  
  // 使用 ref 存储消息历史，确保在异步操作中获取最新值
  const messagesRef = useRef<Message[]>([]);

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

  // 同步 messages 到 ref
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 清理所有资源
  const cleanupResources = useCallback(async () => {
    console.log('[Speaking] 清理资源...');
    
    // 重置状态标志
    isPlayingRef.current = false;
    isRequestingRef.current = false;
    
    // 关闭SSE连接
    if (sseRef.current) {
      try {
        sseRef.current.close();
      } catch (e) {
        // 忽略
      }
      sseRef.current = null;
    }
    
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
  const parseCorrections = (content: string): { 
    mainContent: string; 
    corrections?: Message['corrections'];
    pronunciationCheck?: Message['pronunciationCheck'];
    pronunciationCorrection?: Message['pronunciationCorrection'];
  } => {
    // 检测发音确认请求：🤔 Did you mean "**beach**" instead of "**bitch**"?
    const pronunciationCheckMatch = content.match(/🤔\s*Did you mean\s*\*\*"([^"]+)"\*\*\s*instead of\s*\*\*"([^"]+)"\*\*/i);
    
    // 检测发音纠正：📢 The word "**beach**" is pronounced as /biːtʃ/. Let me say it: "beach"
    const pronunciationCorrectionMatch = content.match(/📢\s*The word\s*\*\*"([^"]+)"\*\*\s*is pronounced as\s*\/([^\/]+)\/.*Let me say it:\s*"([^"]+)"/i);

    let mainContent = content;
    let pronunciationCheck: Message['pronunciationCheck'] | undefined;
    let pronunciationCorrection: Message['pronunciationCorrection'] | undefined;

    // 处理发音纠正
    if (pronunciationCorrectionMatch) {
      pronunciationCorrection = {
        word: pronunciationCorrectionMatch[1],
        phonetic: pronunciationCorrectionMatch[2],
      };
      // 移除发音纠正标记，保留主要内容
      mainContent = mainContent.replace(pronunciationCorrectionMatch[0], '').trim();
    }

    // 处理发音确认请求
    if (pronunciationCheckMatch) {
      pronunciationCheck = {
        correctWord: pronunciationCheckMatch[1],
        wrongWord: pronunciationCheckMatch[2],
      };
      // 不移除内容，让用户看到AI的询问
    }

    // 继续原有的纠正解析逻辑
    const hasCorrectionMarker = content.includes('📝 **Corrections**') || 
                                 content.includes('📝**Corrections**') ||
                                 content.includes('**Corrections**:') ||
                                 content.includes('🎯 **Interview Feedback**');

    if (!hasCorrectionMarker && !pronunciationCheck && !pronunciationCorrection) {
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
        return { mainContent, corrections, pronunciationCheck, pronunciationCorrection };
      }
      return { mainContent, pronunciationCheck, pronunciationCorrection };
    }

    const parts = mainContent.split(/📝\s*\*?\*?Corrections\*?\*?:?|🎯\s*\*?\*?Interview Feedback\*?\*?:?/i);
    mainContent = parts[0].trim();
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

    return { mainContent, corrections, pronunciationCheck, pronunciationCorrection };
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
      // 重置状态
      isPlayingRef.current = false;
      isRequestingRef.current = false;
      
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
        
        // 只播放欢迎语，播放完后等待用户点击按钮开始说话（一人一句模式）
        await playTTS(data.data.greeting);
      }
    } catch (error: any) {
      Alert.alert('错误', error.message || '启动对话失败');
    }
  };

  // 播放TTS
  const playTTS = async (text: string) => {
    try {
      // 防止重复播放
      if (isPlayingRef.current) {
        return;
      }
      isPlayingRef.current = true;
      
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
          try {
            await soundRef.current.unloadAsync();
          } catch (e) {
            // 忽略
          }
        }
        
        // 播放新音频
        const { sound } = await Audio.Sound.createAsync(
          { uri: data.data.audioUri },
          { shouldPlay: true }
        );
        
        soundRef.current = sound;
        
        // 监听播放完成 - 一人一句模式，播放完后回到idle等待用户点击
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            isPlayingRef.current = false;
            setConversationState('idle');
          }
        });
      } else {
        isPlayingRef.current = false;
        setConversationState('idle');
      }
    } catch (error) {
      console.error('TTS error:', error);
      isPlayingRef.current = false;
      setConversationState('idle');
    }
  };

  // 请求麦克风权限（先弹出自定义告知弹窗）
  const requestMicrophonePermission = async () => {
    // 先弹出自定义告知弹窗
    setShowPermissionModal(true);
  };

  // 用户确认授权后，请求系统权限
  const handlePermissionConfirm = async () => {
    setShowPermissionModal(false);
    
    try {
      // 请求系统麦克风权限
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '您拒绝了麦克风权限，口语训练功能将无法使用。您可以稍后在系统设置中开启权限。');
        setConversationState('idle');
        return;
      }

      // 权限已获取，开始录音
      await doStartRecording();
    } catch (error: any) {
      console.error('Request permission error:', error);
      Alert.alert('错误', '权限请求失败');
      setConversationState('idle');
    }
  };

  // 用户取消授权
  const handlePermissionCancel = () => {
    setShowPermissionModal(false);
    setConversationState('idle');
  };

  // 实际开始录音
  const doStartRecording = async () => {
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

      // 设置音频模式（禁止后台录音）
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false, // 禁止后台录音
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

  // 开始监听（录音）- 先检查权限
  const startListening = async () => {
    // 先检查是否已有权限
    const { status } = await Audio.getPermissionsAsync();
    if (status === 'granted') {
      // 已有权限，直接开始录音
      await doStartRecording();
    } else {
      // 没有权限，弹出自定义告知弹窗
      requestMicrophonePermission();
    }
  };

  // 停止监听并处理
  const stopListening = async () => {
    if (!recordingRef.current) return;

    let audioUri: string | null = null;
    
    try {
      setIsRecording(false);
      setConversationState('processing');
      
      const recording = recordingRef.current;
      await recording.stopAndUnloadAsync();
      audioUri = recording.getURI();
      recordingRef.current = null;

      if (!audioUri) {
        setConversationState('idle');
        return;
      }

      // 读取音频并转base64（实时流式处理，不保存录音文件）
      const audioBase64 = await (FileSystem as any).readAsStringAsync(audioUri, {
        encoding: 'base64',
      });

      // 立即删除临时录音文件（合规要求：不保存录音文件）
      try {
        await (FileSystem as any).deleteAsync(audioUri, { idempotent: true });
        console.log('[Speaking] 临时录音文件已删除');
      } catch (deleteError) {
        console.warn('[Speaking] 删除录音文件失败:', deleteError);
      }

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
      // 确保删除录音文件
      if (audioUri) {
        try {
          await (FileSystem as any).deleteAsync(audioUri, { idempotent: true });
        } catch (e) {
          // 忽略删除错误
        }
      }
      setConversationState('idle');
    }
  };

  // 发送给AI
  const sendToAI = async (userText: string) => {
    // 防止重复请求
    if (isRequestingRef.current) {
      console.log('[Speaking] 已有请求在进行中，跳过');
      return;
    }
    
    // 先关闭之前的连接
    if (sseRef.current) {
      try {
        sseRef.current.close();
      } catch (e) {
        // 忽略
      }
      sseRef.current = null;
    }
    
    // 设置请求标志
    isRequestingRef.current = true;

    try {
      const url = `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/speaking/chat`;
      
      // 使用 ref 获取最新的消息历史
      const currentMessages = messagesRef.current;
      
      // 构建完整的消息列表（包括新消息）
      const updatedMessages = [...currentMessages, { role: 'user' as const, content: userText }];
      
      console.log('[Speaking] 发送消息给AI，历史消息数:', currentMessages.length);
      console.log('[Speaking] 用户输入:', userText);
      
      const sse = new RNSSE(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt,
        }),
      });
      
      // 保存引用
      sseRef.current = sse;

      let fullResponse = '';
      let closed = false;

      const handleClose = () => {
        if (closed) return;
        closed = true;
        isRequestingRef.current = false;
        
        try {
          sse.close();
        } catch (e) {
          // 忽略
        }
        sseRef.current = null;
      };

      sse.addEventListener('message', (event: any) => {
        if (closed) return;
        
        if (event.data === '[DONE]') {
          handleClose();
          
          console.log('[Speaking] AI回复完成，长度:', fullResponse.length);
          
          const { mainContent, corrections, pronunciationCheck, pronunciationCorrection } = parseCorrections(fullResponse);
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: mainContent,
            timestamp: new Date(),
            corrections,
            pronunciationCheck,
            pronunciationCorrection,
          };
          
          setMessages(prev => [...prev, assistantMessage]);
          setCurrentResponse('');
          
          // 播放回复
          playTTS(mainContent);
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

      sse.addEventListener('error', (error: any) => {
        if (closed) return;
        console.error('SSE error:', error);
        handleClose();
        setConversationState('idle');
      });

    } catch (error: any) {
      console.error('Send to AI error:', error);
      isRequestingRef.current = false;
      setConversationState('idle');
    }
  };

  // 打断AI说话
  const interruptSpeaking = async () => {
    if (soundRef.current && conversationState === 'speaking') {
      isPlayingRef.current = false;
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

  // 处理发音确认回复（用户点击"是"或"不是"）
  const handlePronunciationConfirm = async (confirmed: boolean, correctWord: string, wrongWord: string) => {
    if (confirmed) {
      // 用户确认是这个意思，继续对话
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `Yes, I meant "${correctWord}".`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      await sendToAI(`Yes, I meant "${correctWord}".`);
    } else {
      // 用户说不是，告诉AI用户实际想说别的词，请求发音纠正
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `No, I didn't mean "${correctWord}". Please tell me the correct pronunciation.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      await sendToAI(`No, I didn't mean "${correctWord}". I might have mispronounced it. What is the correct pronunciation of "${correctWord}"?`);
    }
  };

  // 播放单词发音
  const playWordPronunciation = async (word: string) => {
    try {
      setConversationState('speaking');
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/audio/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: word,
          voice: 'en-US-Neural2-F',
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.audioUri) {
        if (soundRef.current) {
          try {
            await soundRef.current.unloadAsync();
          } catch (e) {
            // 忽略
          }
        }
        
        const { sound } = await Audio.Sound.createAsync(
          { uri: data.data.audioUri },
          { shouldPlay: true }
        );
        
        soundRef.current = sound;
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            isPlayingRef.current = false;
            setConversationState('idle');
          }
        });
      } else {
        setConversationState('idle');
      }
    } catch (error) {
      console.error('Play word pronunciation error:', error);
      setConversationState('idle');
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
        return { icon: 'microphone', color: theme.primary, label: '语音对话（需录音权限）' };
      case 'listening':
        return { icon: 'stop', color: theme.error, label: '点击停止录音' };
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
            
            {/* 发音确认请求 */}
            {message.role === 'assistant' && message.pronunciationCheck && (
              <View style={styles.pronunciationCheckContainer}>
                <View style={styles.pronunciationCheckButtons}>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.confirmYes]}
                    onPress={() => handlePronunciationConfirm(
                      true, 
                      message.pronunciationCheck!.correctWord,
                      message.pronunciationCheck!.wrongWord
                    )}
                  >
                    <ThemedText variant="body" color={theme.buttonPrimaryText}>是，就是这个意思</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.confirmNo]}
                    onPress={() => handlePronunciationConfirm(
                      false, 
                      message.pronunciationCheck!.correctWord,
                      message.pronunciationCheck!.wrongWord
                    )}
                  >
                    <ThemedText variant="body" color={theme.textPrimary}>不是</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* 发音纠正信息 */}
            {message.role === 'assistant' && message.pronunciationCorrection && (
              <View style={styles.pronunciationCorrectionContainer}>
                <View style={styles.pronunciationWordRow}>
                  <ThemedText variant="h3" color={theme.primary} style={styles.pronunciationWord}>
                    {message.pronunciationCorrection.word}
                  </ThemedText>
                  <TouchableOpacity
                    style={styles.playPronunciationButton}
                    onPress={() => playWordPronunciation(message.pronunciationCorrection!.word)}
                  >
                    <FontAwesome6 name="volume-high" size={20} color={theme.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.phoneticText, { color: theme.textSecondary }]}>
                  /{message.pronunciationCorrection.phonetic}/
                </Text>
                <ThemedText variant="caption" color={theme.textMuted} style={styles.pronunciationHint}>
                  点击播放正确发音
                </ThemedText>
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
      
      {/* 权限告知弹窗 - 系统权限弹窗前显示 */}
      <Modal
        visible={showPermissionModal}
        transparent
        animationType="fade"
        onRequestClose={handlePermissionCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.permissionModal, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.permissionHeader}>
              <FontAwesome6 name="microphone" size={32} color={theme.primary} />
              <ThemedText variant="h3" color={theme.textPrimary} style={styles.permissionTitle}>
                麦克风权限申请
              </ThemedText>
            </View>
            
            <View style={styles.permissionContent}>
              <ThemedText variant="body" color={theme.textSecondary} style={styles.permissionText}>
                本功能将使用麦克风进行语音输入，录音仅用于发送给 AI 大模型生成回答。
              </ThemedText>
              
              <View style={[styles.permissionFeatures, { backgroundColor: theme.backgroundRoot }]}>
                <View style={styles.featureItem}>
                  <FontAwesome6 name="check-circle" size={16} color={theme.success} />
                  <ThemedText variant="body" color={theme.textSecondary}>录音实时流式传输，不留本地缓存</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <FontAwesome6 name="check-circle" size={16} color={theme.success} />
                  <ThemedText variant="body" color={theme.textSecondary}>全程 HTTPS 加密传输</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <FontAwesome6 name="check-circle" size={16} color={theme.success} />
                  <ThemedText variant="body" color={theme.textSecondary}>不上传第三方服务器</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <FontAwesome6 name="check-circle" size={16} color={theme.success} />
                  <ThemedText variant="body" color={theme.textSecondary}>不存储录音文件</ThemedText>
                </View>
              </View>
            </View>
            
            <View style={styles.permissionButtons}>
              <TouchableOpacity
                style={[styles.permissionButton, styles.permissionCancelButton, { backgroundColor: theme.backgroundRoot }]}
                onPress={handlePermissionCancel}
              >
                <ThemedText variant="body" color={theme.textSecondary}>拒绝</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.permissionButton, styles.permissionConfirmButton, { backgroundColor: theme.primary }]}
                onPress={handlePermissionConfirm}
              >
                <ThemedText variant="body" color={theme.buttonPrimaryText}>允许使用麦克风</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
