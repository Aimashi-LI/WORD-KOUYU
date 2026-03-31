import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import RNSSE from 'react-native-sse';
import { useAI } from '@/hooks/useAI';

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
}

type SpeakingMode = 'select' | 'chat';

export default function SpeakingScreen() {
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
        '请先配置豆包 API 密钥',
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

      // 上传音频进行语音识别
      const formData = new FormData();
      formData.append('audio', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);

      const asrResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/audio/asr`, {
        method: 'POST',
        body: formData,
      });
      
      const asrData = await asrResponse.json();
      
      if (asrData.success && asrData.data?.text) {
        setInputText(asrData.data.text);
      } else {
        Alert.alert('提示', '语音识别失败，请重试');
      }
    } catch (error: any) {
      console.error('Stop recording error:', error);
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

  const renderSelectMode = () => (
    <View style={styles.selectContainer}>
      <Text style={styles.title}>AI 口语训练</Text>
      <Text style={styles.subtitle}>选择训练场景</Text>

      <View style={styles.sceneList}>
        {scenes.map(scene => (
          <TouchableOpacity
            key={scene.id}
            style={styles.sceneCard}
            onPress={() => startChat(scene)}
            disabled={isProcessing}
          >
            <Text style={styles.sceneName}>{scene.name}</Text>
            <Text style={styles.sceneGreeting} numberOfLines={2}>
              {scene.greeting}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!isConfigured && (
        <TouchableOpacity style={styles.configButton} onPress={openSettings}>
          <Text style={styles.configButtonText}>配置 AI API 密钥</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderChatMode = () => (
    <View style={styles.chatContainer}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={handleEndChat}>
          <Text style={styles.backButton}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.chatTitle}>{selectedScene?.name}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
        {messages.map(message => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text style={[
              styles.messageText,
              message.role === 'user' ? styles.userText : styles.assistantText,
            ]}>
              {message.content}
            </Text>
          </View>
        ))}

        {/* AI正在生成 */}
        {isGenerating && currentResponse && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <Text style={[styles.messageText, styles.assistantText]}>
              {currentResponse}
            </Text>
          </View>
        )}

        {isGenerating && !currentResponse && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        {/* 录音按钮 */}
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordingButton]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={isProcessing || isGenerating}
        >
          <Text style={styles.recordIcon}>{isRecording ? '⏹️' : '🎤'}</Text>
        </TouchableOpacity>

        {/* 文本输入 */}
        <TextInput
          style={styles.textInput}
          placeholder="输入或录音..."
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
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>

      {/* 处理中提示 */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.processingText}>处理中...</Text>
        </View>
      )}
    </View>
  );

  return (
    <Screen>
      {mode === 'select' && renderSelectMode()}
      {mode === 'chat' && renderChatMode()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  selectContainer: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  sceneList: {
    gap: 15,
  },
  sceneCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sceneName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sceneGreeting: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  configButton: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  configButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
    padding: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  recordButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  recordingButton: {
    backgroundColor: '#FF3B30',
  },
  recordIcon: {
    fontSize: 20,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendIcon: {
    color: '#fff',
    fontSize: 18,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#007AFF',
  },
});
