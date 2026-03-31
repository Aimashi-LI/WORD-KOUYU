import { Router, Request, Response } from 'express';
import { TTSClient, ASRClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { storageService } from '../services/storageService';
import { AISettings, AI_MODELS } from '../types/ai';

const router = Router();

/**
 * 文本转语音 (TTS)
 * POST /api/v1/audio/tts
 */
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, speaker, speechRate, audioFormat } = req.body;

    if (!text) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段：text',
      });
      return;
    }

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    
    // 创建 TTS 客户端
    const config = new Config();
    const ttsClient = new TTSClient(config, customHeaders);

    // 合成语音
    const response = await ttsClient.synthesize({
      uid: 'user',
      text,
      speaker: speaker || 'zh_female_vv_uranus_bigtts', // 默认中英双语女声
      speechRate: speechRate || 0,
      audioFormat: audioFormat || 'mp3',
    });

    res.json({
      success: true,
      data: {
        audioUri: response.audioUri,
        audioSize: response.audioSize,
      },
    });
  } catch (error: any) {
    console.error('TTS error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '语音合成失败',
    });
  }
});

/**
 * 语音转文字 (ASR)
 * POST /api/v1/audio/asr
 */
router.post('/asr', async (req: Request, res: Response) => {
  try {
    const { audioUrl, base64Data } = req.body;

    if (!audioUrl && !base64Data) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段：audioUrl 或 base64Data',
      });
      return;
    }

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    
    // 创建 ASR 客户端
    const config = new Config();
    const asrClient = new ASRClient(config, customHeaders);

    // 识别语音
    const result = await asrClient.recognize({
      uid: 'user',
      url: audioUrl,
      base64Data: base64Data,
    });

    res.json({
      success: true,
      data: {
        text: result.text,
        duration: result.duration,
      },
    });
  } catch (error: any) {
    console.error('ASR error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '语音识别失败',
    });
  }
});

/**
 * 批量生成单词听写音频
 * POST /api/v1/audio/dictation/generate
 */
router.post('/dictation/generate', async (req: Request, res: Response) => {
  try {
    const { words, interval = 5 } = req.body; // interval: 每个单词之间的间隔秒数

    if (!words || !Array.isArray(words) || words.length === 0) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段：words（单词数组）',
      });
      return;
    }

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    
    // 创建 TTS 客户端
    const config = new Config();
    const ttsClient = new TTSClient(config, customHeaders);

    // 生成每个单词的音频
    const audioList = [];
    
    for (const wordItem of words) {
      const { word, definition } = wordItem;
      
      // 第一次朗读：英文单词
      const wordAudio = await ttsClient.synthesize({
        uid: 'user',
        text: word,
        speaker: 'zh_female_vv_uranus_bigtts',
        speechRate: -10, // 稍慢一点
      });
      
      // 第二次朗读：单词 + 释义
      const fullText = definition ? `${word}. ${definition}` : word;
      const fullAudio = await ttsClient.synthesize({
        uid: 'user',
        text: fullText,
        speaker: 'zh_female_vv_uranus_bigtts',
        speechRate: 0,
      });

      audioList.push({
        word,
        definition,
        wordAudioUri: wordAudio.audioUri,
        fullAudioUri: fullAudio.audioUri,
      });
    }

    res.json({
      success: true,
      data: {
        audios: audioList,
        interval,
        totalCount: audioList.length,
      },
    });
  } catch (error: any) {
    console.error('Dictation generate error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '生成听写音频失败',
    });
  }
});

export default router;
