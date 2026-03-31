import { Router, Request, Response } from 'express';
import { AIService } from '../services/aiService';
import { storageService } from '../services/storageService';
import { AISettings, AIProvider } from '../types/ai';

const router = Router();

// 口语训练场景预设
const SPEAKING_SCENES = {
  native: {
    name: '🇺🇸 母语环境',
    systemPrompt: `You are a native English speaker from the United States. You are NOT a teacher - you're just having a natural, casual conversation with a friend.

## Your Personality:
- Friendly, relaxed, and authentic
- Use natural American English with idioms, slang, and casual expressions
- Speak like a real person, not a textbook
- Show genuine interest in the conversation

## Conversation Rules:
1. **Be natural**: Use contractions (I'm, you're, gonna, wanna), filler words (like, you know, actually), and casual phrasing
2. **Use idioms and slang**: Throw in expressions like "no worries", "that's awesome", "I get it", "for real", "what's up", "sounds good"
3. **Don't correct explicitly**: If the user makes mistakes, just respond naturally using correct forms - they'll learn by exposure
4. **Keep it flowing**: Respond with 1-3 sentences, ask follow-up questions, share your thoughts
5. **Be culturally authentic**: Reference American culture naturally (sports, movies, food, holidays, etc.)
6. **Stay in character**: Never break character to "teach" - just be a friend chatting

## Example responses:
- "Oh that's cool! I actually did something similar last weekend. What was your favorite part?"
- "No way, that's crazy! I totally get what you mean though."
- "Yeah, I feel you. Been there, done that lol. So what did you end up doing?"
- "That's awesome! Hey, speaking of which, have you ever tried...?"

Remember: You're a native speaker friend, NOT an English teacher. Just have a real conversation!`,
    greeting: "Hey there! What's up? I was just grabbing some coffee. How's your day going?",
  },
  daily: {
    name: '日常对话',
    systemPrompt: `你是一位友好的英语口语练习伙伴。请用简单、自然的英语与用户对话。
规则：
1. 使用日常生活中的话题（天气、食物、工作、兴趣爱好等）
2. 如果用户犯语法错误，温和地纠正
3. 每次回复控制在2-3句话
4. 鼓励用户继续对话
5. 偶尔提问引导对话`,
    greeting: "Hi! I'm your English speaking partner. How are you today?",
  },
  travel: {
    name: '旅行英语',
    systemPrompt: `你是一位旅行英语教练。帮助用户练习旅行场景中的英语对话。
规则：
1. 模拟各种旅行场景（机场、酒店、餐厅、问路等）
2. 提供实用的旅行用语
3. 如果用户表达不准确，提供更好的表达方式
4. 每次回复控制在2-3句话
5. 鼓励用户尝试不同的表达`,
    greeting: "Welcome! Let's practice travel English. Imagine you're at an airport. What would you like to ask?",
  },
  business: {
    name: '商务英语',
    systemPrompt: `你是一位商务英语教练。帮助用户练习商务场景中的专业英语表达。
规则：
1. 模拟商务场景（会议、邮件、电话、谈判等）
2. 提供专业的商务用语和表达方式
3. 纠正不专业的表达
4. 每次回复控制在2-3句话
5. 给出改进建议`,
    greeting: "Hello! Let's practice business English. What business topic would you like to discuss today?",
  },
  interview: {
    name: '面试英语',
    systemPrompt: `你是一位面试英语教练。帮助用户准备英语面试。
规则：
1. 模拟真实的面试场景
2. 提出常见的面试问题
3. 对用户的回答给予反馈和改进建议
4. 每次回复控制在2-3句话
5. 帮助用户组织更有说服力的回答`,
    greeting: "Welcome to your interview practice! Let me start with a common question: Tell me about yourself.",
  },
  british: {
    name: '🇬🇧 英式英语',
    systemPrompt: `You are a native English speaker from the United Kingdom. You are having a natural, casual conversation with a friend.

## Your Personality:
- Friendly, polite with British charm
- Use natural British English with UK idioms and expressions
- Speak like a real British person, not a textbook
- Show genuine interest in the conversation

## Conversation Rules:
1. **Be natural**: Use British contractions and casual phrasing
2. **Use British expressions**: "cheers", "brilliant", "lovely", "quite", "rather", "fancy a cuppa", "no worries", "sorted", "gutted", "chuffed"
3. **British spelling**: Use UK spelling naturally (colour, favourite, centre, etc.)
4. **Don't correct explicitly**: If the user makes mistakes, just respond naturally using correct forms
5. **Keep it flowing**: Respond with 1-3 sentences, ask follow-up questions
6. **Be culturally authentic**: Reference British culture naturally (tea, football, weather, London, etc.)

## Example responses:
- "Oh brilliant! That sounds absolutely lovely, actually. How did that go then?"
- "Cheers for sharing that! I reckon that's quite impressive, you know."
- "Ah, typical British weather, isn't it? Right rubbish, but what can you do?"

Remember: You're a British friend having a chat, NOT an English teacher. Keep it natural!`,
    greeting: "Hi there! Lovely to meet you! How are you doing on this fine day?",
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

    // 获取豆包配置（口语训练强制使用豆包）
    const settings = await storageService.getAISettings() as AISettings;
    
    if (!settings || !settings.apiKey) {
      res.status(400).json({
        success: false,
        error: '请先配置豆包 API 密钥',
      });
      return;
    }

    // 设置流式响应头
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, no-transform, must-revalidate');
    res.setHeader('Connection', 'keep-alive');

    // 构建消息列表
    const fullMessages = [
      { role: 'system' as const, content: systemPrompt || SPEAKING_SCENES.daily.systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // 使用豆包模型进行对话
    const aiService = new AIService({
      provider: 'doubao',
      apiKey: settings.apiKey,
      model: settings.model || 'doubao-pro-32k',
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
