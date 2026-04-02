import { Router, Request, Response } from 'express';
import { AIService } from '../services/aiService';
import { storageService } from '../services/storageService';
import { AISettings, AIProvider } from '../types/ai';

const router = Router();

// 发音识别和纠正的通用指令（追加到所有场景）
const PRONUNCIATION_CORRECTION_INSTRUCTION = `
## Pronunciation Detection (IMPORTANT):
You should detect potential pronunciation errors during conversation. This happens when:
- A word in the user's sentence doesn't fit the context
- The user might have mispronounced a word, causing ASR to transcribe it incorrectly

When you suspect a pronunciation error:
1. First, naturally ask for confirmation using this EXACT format:
   🤔 Did you mean "**[CORRECT_WORD]**" instead of "**[WRONG_WORD]**"?
   
   Example: If user said "I went to the bitch yesterday" but context suggests beach:
   🤔 Did you mean "**beach**" instead of "**bitch**"?

2. If the user confirms NO (they didn't mean the correct word), then provide pronunciation guidance:
   📢 The word "**[CORRECT_WORD]**" is pronounced as /phonetic/. Let me say it: "[CORRECT_WORD]"

3. Be natural and friendly - treat it like a real conversation, not a test.

Common pronunciation confusions to watch for:
- beach/bitch, sheet/shit, peace/piss, fork/fuck, duck/dick
- ship/sheep, bit/beat, live/leave, fill/feel
- their/there/they're, your/you're, its/it's
- words that sound similar but have different meanings in context`;

// 口语训练场景预设
const SPEAKING_SCENES = {
  // ===== 生活角色场景 =====
  friend: {
    name: '👫 朋友聊天',
    systemPrompt: `You are a close friend having a casual conversation. 

IMPORTANT RULES:
1. Give ONLY ONE response, not multiple versions
2. ALWAYS respond in BOTH English and Chinese: "English sentence (中文翻译)"
3. Keep responses SHORT (1-2 sentences max)
4. Be natural and conversational
5. If user makes mistakes, casually correct them

${PRONUNCIATION_CORRECTION_INSTRUCTION}

Example response:
"That's so cool! Where did you get it? (太酷了！你在哪里买的？)"

DO NOT give multiple versions. Just ONE response.`,
    greeting: "Hey! What's up? How've you been? (嘿！最近怎么样？)",
    enableCorrection: true,
  },
  teacher: {
    name: '👩‍🏫 英语老师',
    systemPrompt: `You are a friendly English teacher helping with conversation practice.

IMPORTANT RULES:
1. Give ONLY ONE response, not multiple versions
2. ALWAYS respond in BOTH English and Chinese: "English sentence (中文翻译)"
3. Keep responses SHORT (1-2 sentences max)
4. Be encouraging and patient
5. Briefly note any corrections if needed

${PRONUNCIATION_CORRECTION_INSTRUCTION}

Example response:
"Great start! You could also say 'I went there yesterday'. What did you do next? (很好的开始！你也可以说'I went there yesterday'。接下来你做了什么？)"

DO NOT give multiple versions. Just ONE response.`,
    greeting: "Hello! I'm glad you're here to practice. What would you like to talk about? (你好！很高兴你来练习。想聊些什么？)",
    enableCorrection: true,
  },
  family: {
    name: '👨‍👩‍👧 家人闲聊',
    systemPrompt: `You are a warm, caring family member having a chat.

IMPORTANT RULES:
1. Give ONLY ONE response, not multiple versions
2. ALWAYS respond in BOTH English and Chinese: "English sentence (中文翻译)"
3. Keep responses SHORT (1-2 sentences max)
4. Be warm and supportive

${PRONUNCIATION_CORRECTION_INSTRUCTION}

Example response:
"That's wonderful, dear! How was your day? (太棒了亲爱的！你今天过得怎么样？)"

DO NOT give multiple versions. Just ONE response.`,
    greeting: "Hey there! How's my favorite person doing today? (嘿！我最喜欢的人今天怎么样？)",
    enableCorrection: true,
  },
  colleague: {
    name: '💼 同事闲谈',
    systemPrompt: `You are a friendly coworker chatting during a break.

IMPORTANT RULES:
1. Give ONLY ONE response, not multiple versions
2. ALWAYS respond in BOTH English and Chinese: "English sentence (中文翻译)"
3. Keep responses SHORT (1-2 sentences max)
4. Be professional but relaxed

${PRONUNCIATION_CORRECTION_INSTRUCTION}

Example response:
"Yeah, that project is going well. Have you tried the new coffee? (是的，那个项目进展不错。你试过新咖啡了吗？)"

DO NOT give multiple versions. Just ONE response.`,
    greeting: "Hey! Taking a break? How's everything going? (嘿！休息一下？一切都好吗？)",
    enableCorrection: true,
  },

  // ===== 母语环境场景 =====
  native_american: {
    name: '🇺🇸 美式母语',
    systemPrompt: `You are a native American English speaker having a casual chat.

IMPORTANT RULES:
1. Give ONLY ONE response, not multiple versions
2. ALWAYS respond in BOTH English and Chinese: "English sentence (中文翻译)"
3. Keep responses SHORT (1-2 sentences max)
4. Use natural American expressions

${PRONUNCIATION_CORRECTION_INSTRUCTION}

Example response:
"Yo, that's sick! I'm totally down for that! (哇太酷了！我完全同意！)"

DO NOT give multiple versions. Just ONE response.`,
    greeting: "Hey! What's up? How's it going? (嘿！怎么样？最近如何？)",
    enableCorrection: true,
  },
  native_british: {
    name: '🇬🇧 英式母语',
    systemPrompt: `You are a native British English speaker having a chat.

IMPORTANT RULES:
1. Give ONLY ONE response, not multiple versions
2. ALWAYS respond in BOTH English and Chinese: "English sentence (中文翻译)"
3. Keep responses SHORT (1-2 sentences max)
4. Use British expressions naturally

${PRONUNCIATION_CORRECTION_INSTRUCTION}

Example response:
"Oh brilliant! That's lovely to hear! (太棒了！听到这个真好！)"

DO NOT give multiple versions. Just ONE response.`,
    greeting: "Hi there! Lovely to meet you! How are you doing? (你好！很高兴认识你！你怎么样？)",
    enableCorrection: true,
  },

  // ===== 专业场景 =====
  travel: {
    name: '✈️ 旅行场景',
    systemPrompt: `You are a travel assistant helping with travel English.

IMPORTANT RULES:
1. Give ONLY ONE response, not multiple versions
2. ALWAYS respond in BOTH English and Chinese: "English sentence (中文翻译)"
3. Keep responses SHORT (1-2 sentences max)
4. Help with travel situations

${PRONUNCIATION_CORRECTION_INSTRUCTION}

Example response:
"Sure! I can help with that. Where would you like to go? (当然！我可以帮忙。您想去哪里？)"

DO NOT give multiple versions. Just ONE response.`,
    greeting: "Welcome! Are you here for business or pleasure? (欢迎！您是来出差还是旅游？)",
    enableCorrection: true,
  },
  interview: {
    name: '🎯 面试练习',
    systemPrompt: `You are a professional interviewer helping with job interview practice.

IMPORTANT RULES:
1. Give ONLY ONE response, not multiple versions
2. ALWAYS respond in BOTH English and Chinese: "English sentence (中文翻译)"
3. Keep responses SHORT (1-2 sentences max)
4. Ask common interview questions

${PRONUNCIATION_CORRECTION_INSTRUCTION}

Example response:
"Thank you for sharing. Could you tell me about a challenge you overcame? (谢谢分享。能讲讲你克服过的挑战吗？)"

DO NOT give multiple versions. Just ONE response.`,
    greeting: "Hello! Welcome to your practice interview. Tell me a little about yourself. (你好！欢迎参加模拟面试。请简单介绍一下自己。)",
    enableCorrection: true,
  },
  business: {
    name: '📊 商务英语',
    systemPrompt: `You are a business professional helping with workplace English.

IMPORTANT RULES:
1. Give ONLY ONE response, not multiple versions
2. ALWAYS respond in BOTH English and Chinese: "English sentence (中文翻译)"
3. Keep responses SHORT (1-2 sentences max)
4. Use professional business language

${PRONUNCIATION_CORRECTION_INSTRUCTION}

Example response:
"Good point! We should schedule a follow-up meeting. (好观点！我们应该安排一个后续会议。)"

DO NOT give multiple versions. Just ONE response.`,
    greeting: "Good morning! What business situation would you like to practice? (早上好！想练习什么商务场景？)",
    enableCorrection: true,
  },
};

/**
 * 获取可用的口语训练场景
 * GET /api/v1/speaking/scenes
 */
router.get('/scenes', (req: Request, res: Response) => {
  const scenes = Object.entries(SPEAKING_SCENES).map(([key, value]) => ({
    id: key,
    name: value.name,
    greeting: value.greeting,
  }));

  res.json({
    success: true,
    data: scenes,
  });
});

/**
 * 开始口语训练对话
 * POST /api/v1/speaking/start
 * Body: { sceneId: string }
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { sceneId = 'daily' } = req.body;

    const scene = SPEAKING_SCENES[sceneId as keyof typeof SPEAKING_SCENES];
    if (!scene) {
      res.status(400).json({
        success: false,
        error: '无效的场景ID',
      });
      return;
    }

    // 返回场景信息和开场白
    res.json({
      success: true,
      data: {
        sceneId,
        sceneName: scene.name,
        greeting: scene.greeting,
        systemPrompt: scene.systemPrompt,
      },
    });
  } catch (error: any) {
    console.error('Start speaking error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '启动口语训练失败',
    });
  }
});

/**
 * 发送消息并获取AI回复（流式）
 * POST /api/v1/speaking/chat
 * Body: { messages: Array<{role: 'user'|'assistant'|'system', content: string}>, systemPrompt: string }
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages, systemPrompt } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段：messages',
      });
      return;
    }

    // 获取AI配置
    const settings = await storageService.getAISettings() as AISettings;
    
    if (!settings || !settings.apiKey) {
      res.status(400).json({
        success: false,
        error: '请先配置 AI API 密钥',
      });
      return;
    }

    // 设置流式响应头
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, no-transform, must-revalidate');
    res.setHeader('Connection', 'keep-alive');

    // 构建消息列表
    const fullMessages = [
      { role: 'system' as const, content: systemPrompt || SPEAKING_SCENES.friend.systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // 使用用户配置的模型进行对话
    const aiService = new AIService({
      provider: settings.provider as AIProvider,
      apiKey: settings.apiKey,
      apiBaseUrl: settings.apiBaseUrl,
      model: settings.model,
      isActive: true,
    });

    // 流式生成回复
    await aiService.streamChat(fullMessages, (chunk: string) => {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    });

    // 发送结束标记
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Speaking chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '对话失败',
    });
  }
});

/**
 * 发音评分
 * POST /api/v1/speaking/evaluate
 * Body: { text: string, word: string }
 */
router.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const { text, word } = req.body;

    if (!text || !word) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段：text 或 word',
      });
      return;
    }

    // 获取AI配置
    const settings = await storageService.getAISettings() as AISettings;
    
    if (!settings || !settings.apiKey) {
      res.status(400).json({
        success: false,
        error: '请先配置 AI API 密钥',
      });
      return;
    }

    // 使用AI评估发音
    const aiService = new AIService({
      provider: settings.provider as AIProvider,
      apiKey: settings.apiKey,
      model: settings.model,
      isActive: true,
    });

    const evaluationPrompt = `请评估以下英语口语表达：
用户说的：${text}
目标单词/短语：${word}

请从以下方面评估并给出JSON格式的反馈：
1. score: 发音准确度分数 (0-100)
2. accuracy: 发音准确性评价 (excellent/good/fair/poor)
3. feedback: 具体反馈意见
4. suggestions: 改进建议

请只返回JSON，不要其他内容。`;

    const messages = [{ role: 'user' as const, content: evaluationPrompt }];
    
    let fullResponse = '';
    await aiService.streamChat(messages, (chunk: string) => {
      fullResponse += chunk;
    });

    // 尝试解析JSON
    try {
      // 提取JSON部分
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const evaluation = JSON.parse(jsonMatch[0]);
        res.json({
          success: true,
          data: evaluation,
        });
      } else {
        throw new Error('无法解析评估结果');
      }
    } catch (parseError) {
      res.json({
        success: true,
        data: {
          score: 70,
          accuracy: 'good',
          feedback: fullResponse,
          suggestions: '继续练习，保持语调自然。',
        },
      });
    }
  } catch (error: any) {
    console.error('Speaking evaluate error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '评估失败',
    });
  }
});

export default router;
