import axios, { AxiosInstance } from 'axios';
import {
  AIProvider,
  AISettings,
  AIModelConfig,
  AI_MODELS,
  API_BASE_URLS,
  GenerateMnemonicRequest,
  GenerateMnemonicResponse,
  GeneratePhoneticRequest,
  GeneratePhoneticResponse,
  GenerateReviewAdviceRequest,
  GenerateReviewAdviceResponse,
  GenerateAutoFillRequest,
  GenerateAutoFillResponse,
  GenerateSearchWordsRequest,
  GenerateSearchWordsResponse,
  GenerateReviewAnalysisRequest,
  GenerateReviewAnalysisResponse,
  GenerateReviewResultRequest,
  GenerateReviewResultResponse,
  AITestResponse,
} from '../types/ai';

// 导出AIProvider类型供其他模块使用
export type { AIProvider } from '../types/ai';

/**
 * AI 服务类
 * 支持 DeepSeek 和豆包模型
 */
export class AIService {
  private settings: AISettings;
  private client: AxiosInstance;
  private modelConfig: AIModelConfig | undefined;

  constructor(settings: AISettings) {
    this.settings = settings;
    this.modelConfig = AI_MODELS.find(m => m.id === settings.model);

    // 创建 Axios 实例
    this.client = axios.create({
      baseURL: settings.apiBaseUrl || API_BASE_URLS[settings.provider],
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60秒超时
    });

    // 设置认证头
    if (settings.provider === 'deepseek') {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${settings.apiKey}`;
    } else if (settings.provider === 'doubao') {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${settings.apiKey}`;
    }
  }

  /**
   * 测试 API 密钥是否有效
   */
  async testConnection(): Promise<AITestResponse> {
    try {
      // 发送一个简单的请求测试连接
      const response = await this.client.post('/chat/completions', {
        model: this.settings.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      });

      if (response.status === 200) {
        return {
          isValid: true,
          message: 'API 密钥有效',
          models: [this.settings.model],
        };
      }

      return {
        isValid: false,
        message: 'API 密钥无效或网络错误',
      };
    } catch (error: any) {
      console.error('AI test connection error:', error.message);

      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error?.message || error.message;

        if (status === 401) {
          return {
            isValid: false,
            message: 'API 密钥无效或已过期',
          };
        } else if (status === 429) {
          return {
            isValid: false,
            message: 'API 调用频率超限，请稍后再试',
          };
        } else if (status === 402) {
          return {
            isValid: false,
            message: 'Token 余额不足，请充值后继续使用',
          };
        }

        return {
          isValid: false,
          message: `API 错误: ${message}`,
        };
      }

      return {
        isValid: false,
        message: `网络错误: ${error.message}`,
      };
    }
  }

  /**
   * 查询 Token 余额（仅支持 DeepSeek）
   */
  async getTokenBalance(): Promise<{ balance: number; used: number; total: number }> {
    if (this.settings.provider !== 'deepseek') {
      // 豆包暂不支持余额查询，返回默认值
      return {
        balance: -1, // -1 表示不支持查询
        used: 0,
        total: 0,
      };
    }

    try {
      // DeepSeek 余额查询 API
      const response = await this.client.get('/user/balance');
      
      if (response.data) {
        const { is_available, balance_infos } = response.data;
        
        if (is_available && balance_infos && balance_infos.length > 0) {
          const info = balance_infos[0];
          return {
            balance: parseFloat(info.grant_balance || '0'),
            used: parseFloat(info.used_balance || '0'),
            total: parseFloat(info.total_balance || '0'),
          };
        }
      }

      return {
        balance: 0,
        used: 0,
        total: 0,
      };
    } catch (error: any) {
      console.error('Get token balance error:', error.message);
      
      // 如果余额查询失败，返回 -1 表示查询失败
      return {
        balance: -1,
        used: 0,
        total: 0,
      };
    }
  }

  /**
   * 生成助记句子
   */
  async generateMnemonic(request: GenerateMnemonicRequest): Promise<GenerateMnemonicResponse> {
    const { word, definition, split, phonetic } = request;

    // 构建提示词
    const systemPrompt = `你是一个专业的英语单词记忆助手。请为以下单词生成一个助记句，帮助学习者记忆。

要求：
1. 助记句要生动有趣，便于记忆
2. 尽量结合单词的拆分部分（如果有）
3. 句子要简洁，不超过 50 个字
4. 可以使用谐音、联想、故事等方法
5. 用中文回答
6. 只输出助记句，不需要其他说明`;

    const userPrompt = `单词：${word}
音标：${phonetic || '未知'}
定义：${definition || '未知'}
拆分：${split || '无'}

请生成助记句：`;

    try {
      const response = await this.client.post('/chat/completions', {
        model: this.settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const content = response.data.choices[0]?.message?.content || '';
      const tokensUsed = response.data.usage?.total_tokens || 0;

      return {
        mnemonic: content.trim(),
        tokensUsed,
      };
    } catch (error: any) {
      console.error('Generate mnemonic error:', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * 生成音标
   */
  async generatePhonetic(request: GeneratePhoneticRequest): Promise<GeneratePhoneticResponse> {
    const { word } = request;

    const systemPrompt = `你是一个专业的英语发音助手。请为以下英语单词生成音标。

要求：
1. 使用国际音标格式，如 /ˈæpl/
2. 如果有多种发音，给出最常用的发音
3. 只输出音标，不需要其他说明
4. 输出格式：/音标/`;

    const userPrompt = `单词：${word}

请生成音标：`;

    try {
      const response = await this.client.post('/chat/completions', {
        model: this.settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 50,
      });

      const content = response.data.choices[0]?.message?.content || '';
      const tokensUsed = response.data.usage?.total_tokens || 0;

      // 提取音标（可能包含在斜杠中）
      let phonetic = content.trim();
      if (!phonetic.startsWith('/')) {
        phonetic = `/${phonetic}`;
      }
      if (!phonetic.endsWith('/')) {
        phonetic = `${phonetic}/`;
      }

      return {
        phonetic,
        tokensUsed,
      };
    } catch (error: any) {
      console.error('Generate phonetic error:', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * 生成复习建议
   * 基于FSRS算法参数，AI分析单词学习状态并给出建议
   */
  async generateReviewAdvice(request: GenerateReviewAdviceRequest): Promise<GenerateReviewAdviceResponse> {
    const { word, definition, stability, difficulty, reviewCount, lastScore, retrievability, daysSinceLastReview } = request;

    const systemPrompt = `你是一个专业的英语单词复习顾问。根据FSRS记忆算法的参数分析单词的学习状态，给出简短的复习建议。

参数说明：
- stability（稳定性）：记忆持久性，值越大越不容易忘记
- difficulty（难度）：学习难度 0-1，值越大越难
- reviewCount：已复习次数
- retrievability（可提取性）：当前记忆可提取概率 0-1
- lastScore：最近一次得分 0-6

请给出：
1. 一句话的学习建议（不超过30字）
2. 建议的复习间隔（天数）
3. 复习优先级（high/medium/low）

只返回JSON格式：{"advice":"建议","suggestedInterval":数字,"priority":"high/medium/low"}`;

    const userPrompt = `单词：${word}
释义：${definition || '未知'}
稳定性：${stability.toFixed(1)}天
难度：${(difficulty * 100).toFixed(0)}%
复习次数：${reviewCount}
可提取性：${(retrievability * 100).toFixed(0)}%
最近得分：${lastScore !== undefined ? lastScore : '无'}
距上次复习：${daysSinceLastReview !== undefined ? daysSinceLastReview.toFixed(1) : '未知'}天

请分析学习状态并给出建议：`;

    try {
      const response = await this.client.post('/chat/completions', {
        model: this.settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 150,
      });

      const content = response.data.choices[0]?.message?.content || '';
      const tokensUsed = response.data.usage?.total_tokens || 0;

      // 解析JSON响应
      let advice, suggestedInterval, priority;
      try {
        const parsed = JSON.parse(content.trim());
        advice = parsed.advice || '继续保持复习';
        suggestedInterval = parsed.suggestedInterval || Math.round(stability * 1.2);
        priority = parsed.priority || 'medium';
      } catch {
        // 如果解析失败，使用默认值
        advice = content.trim().slice(0, 50) || '继续保持复习';
        suggestedInterval = Math.round(stability * 1.2);
        priority = retrievability < 0.7 ? 'high' : retrievability < 0.9 ? 'medium' : 'low';
      }

      return {
        advice,
        suggestedInterval: Math.max(1, suggestedInterval),
        priority: priority as 'high' | 'medium' | 'low',
        tokensUsed,
      };
    } catch (error: any) {
      console.error('Generate review advice error:', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * 一键自动填充单词信息
   * 根据单词自动生成音标、释义、拆分、助记句和例句
   */
  async generateAutoFill(request: GenerateAutoFillRequest): Promise<GenerateAutoFillResponse> {
    const { word, existingData } = request;

    const systemPrompt = `你是一个专业的英语单词助手。请为以下英语单词生成完整的学习信息。

要求：
1. 音标：使用国际音标格式，如 /ˈæpl/
2. 释义：简洁准确的中文释义，包含词性，如 "n. 苹果"
3. 拆分：将单词拆分成有意义的音节或词根，格式为 "编码-含义，编码-含义"
4. 助记句：生动有趣的助记句，结合拆分部分帮助记忆
5. 励志例句：使用该单词造一个励志、积极向上的英语句子，能激励学习者
6. 搞笑例句：使用该单词造一个幽默、有趣的英语句子，让学习更有趣

返回JSON格式：
{
  "phonetic": "/音标/",
  "definition": "词性 释义",
  "split": "编码-含义，编码-含义",
  "mnemonic": "助记句",
  "inspirationalSentence": "励志英语例句 with Chinese translation",
  "funnySentence": "搞笑英语例句 with Chinese translation"
}

如果某个字段已有数据，可以保持或优化。`;

    const existingInfo = existingData ? `
已有信息：
- 音标：${existingData.phonetic || '无'}
- 释义：${existingData.definition || '无'}
- 拆分：${existingData.split || '无'}
- 助记句：${existingData.mnemonic || '无'}
` : '';

    const userPrompt = `单词：${word}
${existingInfo}
请生成完整的学习信息：`;

    try {
      const response = await this.client.post('/chat/completions', {
        model: this.settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = response.data.choices[0]?.message?.content || '';
      const tokensUsed = response.data.usage?.total_tokens || 0;

      // 解析JSON响应
      let result: GenerateAutoFillResponse = { tokensUsed };
      try {
        const parsed = JSON.parse(content.trim());
        result = {
          phonetic: parsed.phonetic,
          definition: parsed.definition,
          split: parsed.split,
          mnemonic: parsed.mnemonic,
          inspirationalSentence: parsed.inspirationalSentence,
          funnySentence: parsed.funnySentence,
          tokensUsed,
        };
      } catch {
        // 如果解析失败，尝试提取信息
        result = {
          tokensUsed,
        };
      }

      return result;
    } catch (error: any) {
      console.error('Generate auto fill error:', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * AI 搜索单词
   * 根据用户输入的主题搜索相关单词
   */
  async generateSearchWords(request: GenerateSearchWordsRequest): Promise<GenerateSearchWordsResponse> {
    const { query, count = 20, existingWords = [] } = request;

    const systemPrompt = `你是一个专业的英语单词搜索专家和词汇顾问。你的任务是根据用户提供的主题、场景或关键词，精准推荐相关的英语单词。

## 你的专业能力：
1. 熟悉各类英语考试大纲（小学、初中、高中、四六级、考研、托福、雅思、GRE等）
2. 了解不同主题领域的核心词汇（科技、商业、医疗、法律、教育、旅游等）
3. 能准确判断单词的词性、发音和常用释义

## 搜索规则：
1. **主题匹配**：优先返回与搜索主题最相关、最核心的单词
2. **难度适中**：根据搜索关键词推断难度级别，如"高中单词"返回高中词汇
3. **常用优先**：优先返回高频、实用的单词，而非生僻词
4. **准确性**：音标使用国际音标（IPA），释义简洁准确
5. **数量控制**：严格按照要求的数量返回单词

## 输出格式要求：
必须返回标准的JSON格式，不要添加任何额外文字：
{
  "words": [
    {"word": "单词", "phonetic": "/音标/", "definition": "中文释义", "partOfSpeech": "词性"}
  ],
  "description": "关于XXX主题的常用单词推荐"
}

## 词性缩写规范：
- n. 名词
- v. 动词
- adj. 形容词
- adv. 副词
- prep. 介词
- conj. 连词
- interj. 感叹词

## 示例：
用户搜索"高中英语必修一单词"，你应该返回人教版高中英语必修一的核心词汇。`;

    const userPrompt = `请搜索主题为"${query}"的相关英语单词，返回${count}个最相关的单词。

${existingWords.length > 0 ? `注意：以下单词已存在，请避免重复：\n${existingWords.slice(0, 30).join(', ')}\n` : ''}

请直接返回JSON格式的结果，不要包含任何其他说明文字。`;

    try {
      const response = await this.client.post('/chat/completions', {
        model: this.settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 3000,
      });

      const content = response.data.choices[0]?.message?.content || '';
      const tokensUsed = response.data.usage?.total_tokens || 0;

      console.log('[AI Search] Raw response:', content.substring(0, 500));

      // 解析JSON响应
      let words: Array<{
        word: string;
        phonetic?: string;
        definition?: string;
        partOfSpeech?: string;
      }> = [];
      let description = '';

      try {
        // 尝试提取JSON部分（可能被markdown代码块包裹）
        let jsonContent = content.trim();
        
        // 移除可能的markdown代码块标记
        if (jsonContent.includes('```json')) {
          jsonContent = jsonContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        } else if (jsonContent.includes('```')) {
          jsonContent = jsonContent.replace(/```\s*/g, '');
        }
        
        // 尝试找到JSON对象的开始和结束
        const jsonStart = jsonContent.indexOf('{');
        const jsonEnd = jsonContent.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
        }

        const parsed = JSON.parse(jsonContent);
        words = parsed.words || [];
        description = parsed.description || '';
        
        console.log('[AI Search] Parsed words count:', words.length);
      } catch (parseError) {
        console.error('[AI Search] Failed to parse response:', parseError);
        console.error('[AI Search] Content was:', content);
        
        // 尝试更宽松的解析方式
        try {
          // 尝试匹配单词列表的模式
          const wordPattern = /"word"\s*:\s*"([^"]+)"/g;
          const matches = [...content.matchAll(wordPattern)];
          
          if (matches.length > 0) {
            console.log('[AI Search] Found words via pattern matching:', matches.length);
            // 如果找到了单词模式，尝试提取完整信息
            const jsonArrayMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (jsonArrayMatch) {
              const wordsArray = JSON.parse(jsonArrayMatch[0]);
              words = wordsArray;
            }
          }
        } catch (fallbackError) {
          console.error('[AI Search] Fallback parsing also failed:', fallbackError);
        }
      }

      // 过滤无效的单词
      words = words.filter(w => w.word && w.word.trim().length > 0);

      return {
        words,
        description,
        tokensUsed,
      };
    } catch (error: any) {
      console.error('Generate search words error:', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * AI 复习分析
   * 分析所有单词的学习状态，生成个性化复习计划
   */
  async generateReviewAnalysis(request: GenerateReviewAnalysisRequest): Promise<GenerateReviewAnalysisResponse> {
    const { words, context } = request;

    const systemPrompt = `你是一个专业的英语学习顾问和记忆专家。请分析用户所有单词的学习状态，生成个性化的复习计划。

你需要：
1. 分析每个单词的学习状态（稳定性、难度、可提取性、复习历史）
2. 判断哪些单词需要优先复习
3. 为每个需要复习的单词建议最佳复习时间
4. 给出复习策略建议

返回JSON格式：
{
  "analysis": {
    "summary": "整体学习状况总结（50字以内）",
    "urgentCount": 紧急需要复习的单词数,
    "suggestedCount": 建议今日复习的单词数
  },
  "reviewPlan": [
    {
      "wordId": 单词ID,
      "word": "单词",
      "priority": "urgent/high/medium/low",
      "reason": "复习原因（20字以内）",
      "suggestedTime": "建议复习时间（如：今天14:00）",
      "expectedRetention": 预期记忆保持率0-1,
      "reviewStrategy": "复习策略建议（30字以内）"
    }
  ],
  "recommendations": [
    {
      "type": "timing/method/frequency/break",
      "message": "建议内容"
    }
  ],
  "nextReviewReminder": {
    "time": "下次提醒时间",
    "message": "提醒内容"
  }
}

注意：
- priority: urgent表示必须今天复习，high表示建议今天复习，medium表示可以明天复习，low表示可以稍后复习
- 只返回需要复习的单词（排除已掌握且状态良好的单词）
- 考虑遗忘曲线，优先安排接近遗忘临界点的单词
- 给出合理的学习建议`;

    const wordsData = words.map(w => ({
      id: w.id,
      word: w.word,
      definition: w.definition,
      stability: w.stability.toFixed(1),
      difficulty: (w.difficulty * 100).toFixed(0) + '%',
      reviewCount: w.reviewCount,
      lastScore: w.lastScore,
      retrievability: (w.retrievability * 100).toFixed(0) + '%',
      daysSinceLastReview: w.daysSinceLastReview?.toFixed(1),
      nextReviewDate: w.nextReviewDate,
      isMastered: w.isMastered
    }));

    const userPrompt = `当前时间：${context?.currentTime || new Date().toLocaleString('zh-CN')}
学习目标：${context?.studyGoal || '高效复习'}
偏好复习时间：${context?.preferredTime || '随时'}

单词列表（共${words.length}个）：
${JSON.stringify(wordsData, null, 2)}

请分析并生成复习计划：`;

    try {
      const response = await this.client.post('/chat/completions', {
        model: this.settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 3000,
      });

      const content = response.data.choices[0]?.message?.content || '';
      const tokensUsed = response.data.usage?.total_tokens || 0;

      // 解析JSON响应
      let result: GenerateReviewAnalysisResponse = {
        analysis: {
          summary: '暂无分析',
          urgentCount: 0,
          suggestedCount: 0,
        },
        reviewPlan: [],
        recommendations: [],
        tokensUsed,
      };

      try {
        const parsed = JSON.parse(content.trim());
        result = {
          analysis: parsed.analysis || result.analysis,
          reviewPlan: parsed.reviewPlan || [],
          recommendations: parsed.recommendations || [],
          nextReviewReminder: parsed.nextReviewReminder,
          tokensUsed,
        };
      } catch {
        console.error('Failed to parse review analysis response:', content);
      }

      return result;
    } catch (error: any) {
      console.error('Generate review analysis error:', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * AI 复习结果处理
   * 根据用户复习表现，AI计算新的学习参数
   */
  async generateReviewResult(request: GenerateReviewResultRequest): Promise<GenerateReviewResultResponse> {
    const { word, definition, score, responseTime, previousStability, previousDifficulty, reviewCount, recentScores } = request;

    const systemPrompt = `你是一个基于认知心理学的记忆专家。请根据用户的复习表现，计算新的学习参数。

你需要：
1. 根据得分、答题时间、历史表现，计算新的稳定性和难度
2. 决定下次复习时间
3. 判断是否已掌握
4. 给出简短的学习建议

返回JSON格式：
{
  "newStability": 新的稳定性（天数，0.1-365）,
  "newDifficulty": 新的难度（0-1）,
  "nextReviewDate": "下次复习日期（ISO格式）",
  "isMastered": 是否已掌握,
  "advice": "学习建议（30字以内）"
}

规则：
- 得分0-2：稳定性显著降低，难度增加，1-3天内复习
- 得分3-4：稳定性小幅增加，难度不变，按原间隔延长
- 得分5-6：稳定性显著增加，难度降低，间隔大幅延长
- 答题时间短且正确：记忆牢固，可延长间隔
- 答题时间长或错误：记忆不稳定，缩短间隔
- 连续3次得分>=4且稳定性>14天：视为已掌握`;

    const userPrompt = `单词：${word}
释义：${definition || '未知'}
本次得分：${score}/6
答题时间：${responseTime.toFixed(1)}秒
之前稳定性：${previousStability.toFixed(1)}天
之前难度：${(previousDifficulty * 100).toFixed(0)}%
复习次数：${reviewCount}
最近得分：${recentScores?.join(', ') || '无'}

请计算新的学习参数：`;

    try {
      const response = await this.client.post('/chat/completions', {
        model: this.settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const content = response.data.choices[0]?.message?.content || '';
      const tokensUsed = response.data.usage?.total_tokens || 0;

      // 解析JSON响应
      let result: GenerateReviewResultResponse = {
        newStability: previousStability,
        newDifficulty: previousDifficulty,
        nextReviewDate: new Date(Date.now() + previousStability * 24 * 60 * 60 * 1000).toISOString(),
        isMastered: false,
        advice: '继续保持复习',
        tokensUsed,
      };

      try {
        const parsed = JSON.parse(content.trim());
        const now = new Date();
        const suggestedDate = new Date(parsed.nextReviewDate);
        
        // 确保下次复习时间在未来1小时到365天之间
        const minDate = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 最少1小时后
        const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 最多365天后
        
        const finalDate = suggestedDate < minDate ? minDate : suggestedDate > maxDate ? maxDate : suggestedDate;

        result = {
          newStability: Math.max(0.1, Math.min(365, parsed.newStability || previousStability)),
          newDifficulty: Math.max(0, Math.min(1, parsed.newDifficulty ?? previousDifficulty)),
          nextReviewDate: finalDate.toISOString(),
          isMastered: parsed.isMastered || false,
          advice: parsed.advice || '继续保持复习',
          tokensUsed,
        };
      } catch {
        console.error('Failed to parse review result response:', content);
      }

      return result;
    } catch (error: any) {
      console.error('Generate review result error:', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * 流式对话
   * 用于口语训练等需要流式输出的场景
   */
  async streamChat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const response = await this.client.post(
        '/chat/completions',
        {
          model: this.settings.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 500,
          stream: true,
        },
        {
          responseType: 'stream',
        }
      );

      return new Promise((resolve, reject) => {
        let buffer = '';

        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留最后一个不完整的行

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
            
            if (trimmedLine.startsWith('data: ')) {
              try {
                const jsonStr = trimmedLine.slice(6);
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  onChunk(content);
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        });

        response.data.on('end', () => {
          resolve();
        });

        response.data.on('error', (err: Error) => {
          reject(this.handleError(err));
        });
      });
    } catch (error: any) {
      console.error('Stream chat error:', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * 错误处理
   */
  private handleError(error: any): Error {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;

      if (status === 401) {
        return new Error('API 密钥无效或已过期，请检查您的 API 密钥');
      } else if (status === 429) {
        return new Error('API 调用频率超限，请稍后再试');
      } else if (status === 402) {
        return new Error('Token 余额不足，请充值后继续使用');
      } else if (status === 500 || status === 502 || status === 503) {
        return new Error('AI 服务暂时不可用，请稍后再试');
      }

      return new Error(`AI 服务错误: ${message}`);
    }

    return new Error(`网络错误: ${error.message}`);
  }
}

/**
 * 创建 AI 服务实例
 */
export function createAIService(settings: AISettings): AIService {
  return new AIService(settings);
}
