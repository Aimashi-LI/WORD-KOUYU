import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
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
}

interface Scene {
  id: string;
  name: string;
  greeting: string;
  category?: string;
}

type SpeakingMode = 'select' | 'chat';

export default function SpeakingScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [mode, setMode] = useState<SpeakingMode>('select');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  
  const scrollViewRef = useRef<ScrollView>(null);
  const sseRef = useRef<RNSSE | null>(null);

  const { isConfigured, openSettings } = useAI();

  // 清理音频资源
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [sound, recording]);

  // 加载场景列表
  useFocusEffect(
    useCallback(() => {
      loadScenes();
    }, [])
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

  const startChat = async (scene: Scene) => {
    if (!isConfigured) {
      Alert.alert(
        '提示',
        '请先配置 AI API 密钥',
        [
          { text: '取消', style: 'cancel' },
          { text: '去配置', onPress: openSettings },
        ]
      );
      return;
    }

    try {
      setIsProcessing(true);
      
      // 获取场景详情
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/speaking/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId: scene.id }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setSelectedScene(scene);
        setSystemPrompt(data.data.systemPrompt);
        setMessages([
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: data.data.greeting,
            timestamp: new Date(),
          },
        ]);
        setMode('chat');
        
        // 播放欢迎语
        await playTTS(data.data.greeting);
      }
    } catch (error: any) {
      Alert.alert('错误', error.message || '启动对话失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const playTTS = async (text: string) => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/audio/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.audioUri) {
        // 卸载之前的音频
        if (sound) {
          await sound.unloadAsync();
        }
        
        // 播放新音频
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: data.data.audioUri },
          { shouldPlay: true }
        );
        
        setSound(newSound);
      }
    } catch (error) {
      console.error('TTS error:', error);
    }
  };

  const startRecording = async () => {
    try {
      // 请求麦克风权限
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '需要麦克风权限才能录音');
        return;
      }

      // 设置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 开始录音
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
    } catch (error: any) {
      console.error('Start recording error:', error);
      Alert.alert('错误', '录音启动失败');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      setIsProcessing(true);
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        throw new Error('录音文件不存在');
      }

      console.log('[Speaking] 录音完成，URI:', uri);

      // 读取音频文件并转为 base64
      const audioBase64 = await (FileSystem as any).readAsStringAsync(uri, {
        encoding: 'base64',
      });

      console.log('[Speaking] 音频已转为base64，长度:', audioBase64.length);

      // 发送到后端进行语音识别
      const asrResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/audio/asr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data: audioBase64 }),
      });
      
      const asrData = await asrResponse.json();
      console.log('[Speaking] ASR响应:', asrData);
      
      if (asrData.success && asrData.data?.text) {
        const recognizedText = asrData.data.text.trim();
        if (recognizedText) {
          setInputText(recognizedText);
          console.log('[Speaking] 识别成功:', recognizedText);
        } else {
          Alert.alert('提示', '未识别到语音内容，请重试');
        }
      } else {
        const errorMsg = asrData.error || '语音识别失败';
        console.error('[Speaking] ASR错误:', errorMsg);
        Alert.alert('提示', errorMsg);
      }
    } catch (error: any) {
      console.error('[Speaking] 停止录音错误:', error);
      Alert.alert('错误', error.message || '语音识别失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsGenerating(true);
    setCurrentResponse('');

    // 关闭之前的SSE连接
    if (sseRef.current) {
      sseRef.current.close();
    }

    try {
      // 创建SSE连接
      const url = `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/speaking/chat`;
      
      sseRef.current = new RNSSE(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt,
        }),
      });

      let fullResponse = '';

      sseRef.current.addEventListener('message', (event: any) => {
        if (event.data === '[DONE]') {
          // 流结束
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, assistantMessage]);
          setCurrentResponse('');
          setIsGenerating(false);
          
          // 播放回复
          playTTS(fullResponse);
          
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
        setIsGenerating(false);
        Alert.alert('错误', '对话生成失败');
      });

    } catch (error: any) {
      console.error('Send message error:', error);
      setIsGenerating(false);
      Alert.alert('错误', error.message || '发送消息失败');
    }
  };

  const handleEndChat = () => {
    Alert.alert(
      '结束对话',
      '确定要结束本次口语训练吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: () => {
            if (sseRef.current) {
              sseRef.current.close();
            }
            setMessages([]);
            setSelectedScene(null);
            setMode('select');
          },
        },
      ]
    );
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

  const renderSelectMode = () => (
    <View style={styles.selectContainer}>
      {/* 标题 */}
      <View style={styles.headerSection}>
        <FontAwesome6 name="comments" size={40} color={theme.primary} />
        <ThemedText variant="h2" color={theme.textPrimary} style={styles.title}>
          口语训练
        </ThemedText>
        <ThemedText variant="body" color={theme.textMuted} style={styles.subtitle}>
          选择一个角色开始聊天
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
                    disabled={isProcessing}
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

      {/* AI配置提示 */}
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
    <KeyboardAvoidingView 
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
            点击麦克风录音或输入文字
          </ThemedText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map(message => (
            <View
              key={message.id}
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
          ))}

          {/* AI正在生成 */}
          {isGenerating && currentResponse && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.messageText}>
                {currentResponse}
              </ThemedText>
            </View>
          )}

          {isGenerating && !currentResponse && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText variant="caption" color={theme.textMuted} style={styles.typingText}>
                  正在输入...
                </ThemedText>
              </View>
            </View>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        {/* 录音按钮 */}
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordingButton,
            isProcessing && styles.buttonDisabled,
          ]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={isProcessing || isGenerating}
        >
          <FontAwesome6
            name={isRecording ? 'stop' : 'microphone'}
            size={20}
            color={isRecording ? theme.buttonPrimaryText : theme.primary}
          />
        </TouchableOpacity>

        {/* 文本输入 */}
        <TextInput
          style={styles.textInput}
          placeholder="输入消息或点击麦克风录音..."
          placeholderTextColor={theme.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          editable={!isGenerating}
        />

        {/* 发送按钮 */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isGenerating) && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isGenerating}
        >
          <FontAwesome6 name="paper-plane" size={18} color={theme.buttonPrimaryText} />
        </TouchableOpacity>
      </View>

      {/* 处理中提示 */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText variant="body" color={theme.textSecondary} style={styles.processingText}>
            处理中...
          </ThemedText>
        </View>
      )}
    </KeyboardAvoidingView>
  );

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      {mode === 'select' && renderSelectMode()}
      {mode === 'chat' && renderChatMode()}
    </Screen>
  );
}
