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
  AITestResponse,
} from '../types/ai';

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
   * 根据单词自动生成音标、释义、拆分和助记句
   */
  async generateAutoFill(request: GenerateAutoFillRequest): Promise<GenerateAutoFillResponse> {
    const { word, existingData } = request;

    const systemPrompt = `你是一个专业的英语单词助手。请为以下英语单词生成完整的学习信息。

要求：
1. 音标：使用国际音标格式，如 /ˈæpl/
2. 释义：简洁准确的中文释义，包含词性，如 "n. 苹果"
3. 拆分：将单词拆分成有意义的音节或词根，格式为 "编码-含义，编码-含义"
4. 助记句：生动有趣的助记句，结合拆分部分

返回JSON格式：
{
  "phonetic": "/音标/",
  "definition": "词性 释义",
  "split": "编码-含义，编码-含义",
  "mnemonic": "助记句"
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
        max_tokens: 300,
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
