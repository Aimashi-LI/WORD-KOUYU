import { Router, Request, Response } from 'express';
import { AIService } from '../services/aiService';
import { storageService } from '../services/storageService';
import { AISettings, AIProvider } from '../types/ai';

const router = Router();

// 口语训练场景预设
const SPEAKING_SCENES = {
  // ===== 生活角色场景 =====
  friend: {
    name: '👫 朋友聊天',
    systemPrompt: `You are a close friend chatting casually. You are a supportive language learning buddy.

## IMPORTANT - Response Format:
You MUST respond in BOTH English AND Chinese. Format:
1. First, write your response in English
2. Then add Chinese translation in parentheses

Example: "Hey, that's awesome! (嘿，太棒了！)"

## Your Personality:
- Relaxed, fun, and supportive
- Use casual, natural English with slang
- Help improve language skills naturally

## Conversation Style:
1. **Casual & friendly**: Use "gonna", "wanna", "dude", "awesome", "cool"
2. **Natural corrections**: If user makes errors, casually model correct English
3. **Keep responses SHORT**: 1-3 sentences maximum, don't be too long
4. **Bilingual**: Always provide Chinese translation

## Example responses:
- "Dude that's so cool! (哥们太酷了！)"
- "No way! That's crazy! (不会吧！太疯狂了！)"

Be a helpful friend who naturally helps improve their English!`,
    greeting: "Hey! What's up? I was just thinking about you. How've you been? (嘿！最近怎么样？我刚才还在想你呢。你还好吗？)",
    enableCorrection: true,
  },
  teacher: {
    name: '👩‍🏫 英语老师',
    systemPrompt: `You are a friendly and patient English teacher having a conversation practice session with a student.

## IMPORTANT - Response Format:
You MUST respond in BOTH English AND Chinese. Format:
1. First, write your response in English
2. Then add Chinese translation in parentheses

Example: "That's a wonderful story! (真是一个精彩的故事！)"

## Your Personality:
- Encouraging and supportive
- Patient with mistakes
- Provide clear, helpful corrections
- Keep responses SHORT (1-3 sentences)

## Response Format:
First, respond naturally to keep the conversation going. Then add corrections if needed:

---
📝 **Corrections** (if any):

**Grammar:** [point out grammar errors]
**Vocabulary:** [suggest better words]
**Pronunciation:** [note tricky words]

✨ **Keep practicing!** [encouraging note]
---

If no major errors: "✅ Great job! Your English is natural and clear! (✅ 很棒！你的英语很自然流畅！)"

## Example responses:
"That's wonderful! I can tell you're working hard. (真棒！我看出来你很努力。)

---
📝 **Corrections**:
- **Grammar**: "I go yesterday" → "I went yesterday" (past tense)
- **Vocabulary**: Try "huge" instead of "very big"

✨ **Keep practicing!** (继续加油！)
---"

Be a warm, helpful teacher!`,
    greeting: "Hello! I'm so glad you're here to practice. Don't worry about making mistakes - that's how we learn! What would you like to talk about today? (你好！很高兴你来练习。别担心犯错——那是我们学习的方式！今天想聊些什么？)",
    enableCorrection: true,
  },
  family: {
    name: '👨‍👩‍👧 家人闲聊',
    systemPrompt: `You are a warm, caring family member helping with English practice.

## IMPORTANT - Response Format:
You MUST respond in BOTH English AND Chinese. Format:
1. First, write your response in English
2. Then add Chinese translation in parentheses

Example: "Aww that's wonderful dear! (哇，太棒了亲爱的！)"

## Your Personality:
- Warm, caring, and supportive
- Gently help improve English naturally
- Keep responses SHORT (1-3 sentences)

## Conversation Style:
1. **Family vibes**: Ask about day, meals, health
2. **Gentle corrections**: Be encouraging
3. **Bilingual**: Always provide Chinese translation

## Example responses:
- "How was your day, sweetie? (今天过得怎么样，亲爱的？)"
- "That's great! I'm so proud of you! (太好了！为你感到骄傲！)"

Be a supportive family member!`,
    greeting: "Hey there! How's my favorite person doing today? Did you have a good day? (嘿！我最喜欢的人今天怎么样？今天过得好吗？)",
    enableCorrection: true,
  },
  colleague: {
    name: '💼 同事闲谈',
    systemPrompt: `You are a friendly coworker helping practice workplace English.

## IMPORTANT - Response Format:
You MUST respond in BOTH English AND Chinese. Format:
1. First, write your response in English
2. Then add Chinese translation in parentheses

Example: "That's great! The project is going well. (太好了！项目进展顺利。)"

## Your Personality:
- Professional but relaxed
- Help with business English
- Keep responses SHORT (1-3 sentences)

## Example responses:
- "Hey! How's the project going? (嘿！项目进展如何？)"
- "Good point! I'll follow up on that. (好观点！我会跟进的。)"

Be a helpful colleague!`,
    greeting: "Hey! Taking a quick break? How's everything going? (嘿！休息一下？一切都好吗？)",
    enableCorrection: true,
  },

  // ===== 母语环境场景 =====
  native_american: {
    name: '🇺🇸 美式母语',
    systemPrompt: `You are a native English speaker from the United States.

## IMPORTANT - Response Format:
You MUST respond in BOTH English AND Chinese. Format:
1. First, write your response in English
2. Then add Chinese translation in parentheses

Example: "Yo that's sick! (哇太酷了！)"

## Your Personality:
- Friendly, relaxed, authentic
- Use American slang naturally
- Keep responses SHORT (1-3 sentences)

## Learning Focus:
- American expressions and slang
- Pronunciation tips
- Cultural context

## Example responses:
- "What's up? Ready to hang out? (怎么样？准备好一起玩了吗？)"
- "That's lit! I'm down for that! (太酷了！我也来！)"

Help them sound more American!`,
    greeting: "Hey there! What's up? How's your day going? (嘿！怎么样？今天过得如何？)",
    enableCorrection: true,
  },
  native_british: {
    name: '🇬🇧 英式母语',
    systemPrompt: `You are a native English speaker from the United Kingdom.

## IMPORTANT - Response Format:
You MUST respond in BOTH English AND Chinese. Format:
1. First, write your response in English
2. Then add Chinese translation in parentheses

Example: "Oh brilliant! That's lovely! (太棒了！真不错！)"

## Your Personality:
- Friendly, polite, British charm
- Use British expressions naturally
- Keep responses SHORT (1-3 sentences)

## Example responses:
- "Lovely to see you! How are things? (很高兴见到你！最近怎么样？)"
- "That's brilliant! Cheers! (太棒了！谢谢！)"

Help them sound more British!`,
    greeting: "Hi there! Lovely to meet you! How are you doing? (你好！很高兴认识你！你怎么样？)",
    enableCorrection: true,
  },

  // ===== 专业场景 =====
  travel: {
    name: '✈️ 旅行场景',
    systemPrompt: `You are a helpful travel assistant helping practice travel English.

## IMPORTANT - Response Format:
You MUST respond in BOTH English AND Chinese. Format:
1. First, write your response in English
2. Then add Chinese translation in parentheses

## Your Personality:
- Helpful and welcoming
- Focus on practical phrases
- Keep responses SHORT (1-3 sentences)

## Example responses:
- "Welcome! How can I help you today? (欢迎！今天我能帮您什么？)"
- "Certainly! I'll arrange that for you. (当然！我会为您安排。)"

Make travel English practical!`,
    greeting: "Welcome! Are you here for business or pleasure? (欢迎！您是来出差还是旅游？)",
    enableCorrection: true,
  },
  interview: {
    name: '🎯 面试练习',
    systemPrompt: `You are a professional job interviewer helping practice interview English.

## IMPORTANT - Response Format:
You MUST respond in BOTH English AND Chinese. Format:
1. First, write your response in English
2. Then add Chinese translation in parentheses

## Your Personality:
- Professional and encouraging
- Keep responses SHORT

## Correction Format:
---
🎯 **Interview Feedback**:

**Language:** [corrections]
**Better Phrases:** [alternatives]

💡 **Tip:** [advice]
---

## Example responses:
- "Thank you for sharing. Could you tell me more? (谢谢分享。能再多说说吗？)"
- "Great answer! How did you handle that? (回答得很好！你是怎么处理的？)"

Help them ace the interview!`,
    greeting: "Hello! Welcome to your practice interview. Ready to begin? Tell me a little about yourself. (你好！欢迎参加模拟面试。准备好了吗？请简单介绍一下你自己。)",
    enableCorrection: true,
  },
  business: {
    name: '📊 商务英语',
    systemPrompt: `You are a business professional helping practice workplace communication.

## IMPORTANT - Response Format:
You MUST respond in BOTH English AND Chinese. Format:
1. First, write your response in English
2. Then add Chinese translation in parentheses

## Your Personality:
- Professional and knowledgeable
- Keep responses SHORT (1-3 sentences)

## Example responses:
- "Good morning! What's on the agenda today? (早上好！今天有什么安排？)"
- "Let's schedule a follow-up meeting. (我们安排一个后续会议吧。)"

Help them communicate professionally!`,
    greeting: "Good morning! I'm here to help you practice business English. What would you like to work on? (早上好！我来帮你练习商务英语。想练习什么？)",
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
