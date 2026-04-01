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

    const systemPrompt = `你是一个专业的英语单词复习顾问，精通FSRS（Free Spaced Repetition Scheduler）记忆算法。你的任务是根据单词的学习参数，给出精准的复习建议。

## FSRS算法参数说明：
- **stability（稳定性）**：记忆持久性，表示记忆能保持多长时间不遗忘
  - < 1天：极不稳定，需要立即复习
  - 1-7天：短期记忆，需要频繁复习
  - 7-30天：中期记忆，逐渐稳定
  - > 30天：长期记忆，已较牢固

- **difficulty（难度）**：学习难度 0-1
  - 0-0.3：容易，学习效率高
  - 0.3-0.7：中等，需要正常复习
  - 0.7-1：困难，需要更多练习

- **retrievability（可提取性）**：当前回忆成功的概率 0-1
  - > 0.9：很容易回忆，可以延后复习
  - 0.7-0.9：正常范围
  - < 0.7：即将遗忘，需要立即复习

- **reviewCount（复习次数）**：已复习次数
  - 0-2次：新学单词，记忆不稳定
  - 3-5次：逐渐熟悉
  - > 5次：较为巩固

- **lastScore（最近得分）**：最近一次复习得分 0-6
  - 0-2：失败，需要重点复习
  - 3-4：及格，正常进度
  - 5-6：优秀，记忆牢固

## 复习建议规则：
1. **紧急程度判断**：
   - retrievability < 0.6 且 stability < 7天 → urgent
   - retrievability < 0.8 或 lastScore < 3 → high
   - 正常学习进度 → medium
   - stability > 30天 且 retrievability > 0.9 → low

2. **间隔计算建议**：
   - 如果上次得分高，间隔可延长20-50%
   - 如果上次得分低，间隔应缩短或重置
   - 遵循遗忘曲线原理

3. **建议内容要求**：
   - 针对性强，指出具体问题
   - 给出可执行的复习策略
   - 鼓励性语言，增强学习动力

## 输出格式：
只返回标准JSON格式，不要添加任何额外文字：
{"advice":"具体建议（不超过30字）","suggestedInterval":建议间隔天数,"priority":"urgent/high/medium/low"}`;

    const userPrompt = `请分析以下单词的学习状态并给出复习建议：

**单词信息**：
- 单词：${word}
- 释义：${definition || '未知'}

**学习参数**：
- 稳定性：${stability.toFixed(1)} 天
- 难度：${(difficulty * 100).toFixed(0)}%
- 复习次数：${reviewCount} 次
- 可提取性：${(retrievability * 100).toFixed(0)}%
- 最近得分：${lastScore !== undefined ? lastScore + '/6' : '无'}
- 距上次复习：${daysSinceLastReview !== undefined ? daysSinceLastReview.toFixed(1) + ' 天' : '未知'}

请直接返回JSON格式的建议：`;

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
    {"word": "单词", "phonetic": "/音标/", "definition": "中文释义", "partOfSpeech": "n."}
  ],
  "description": "关于XXX主题的常用单词推荐"
}

## 重要：词性字段 (partOfSpeech) 是必填项！
每个单词必须包含词性，使用以下标准缩写：
- n. 名词 (如: apple, book, water)
- v. 动词 (如: run, eat, think)
- adj. 形容词 (如: happy, big, beautiful)
- adv. 副词 (如: quickly, very, always)
- prep. 介词 (如: in, on, at)
- conj. 连词 (如: and, but, because)
- interj. 感叹词 (如: oh, wow, hello)
- pron. 代词 (如: I, you, he)
- art. 冠词 (如: a, an, the)

如果一个单词有多种词性，只标注最常见的词性。

## 示例输出：
{
  "words": [
    {"word": "apple", "phonetic": "/ˈæpl/", "definition": "苹果", "partOfSpeech": "n."},
    {"word": "run", "phonetic": "/rʌn/", "definition": "跑，奔跑", "partOfSpeech": "v."},
    {"word": "beautiful", "phonetic": "/ˈbjuːtɪfl/", "definition": "美丽的，漂亮的", "partOfSpeech": "adj."}
  ],
  "description": "基础英语单词推荐"
}`;

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

    const systemPrompt = `你是一个专业的英语学习顾问和记忆专家，精通艾宾浩斯遗忘曲线和FSRS记忆算法。你的任务是根据用户所有单词的学习状态，制定科学、高效的个性化复习计划。

## 你的专业能力：
1. **记忆规律分析**：理解遗忘曲线原理，预测最佳复习时机
2. **优先级排序**：根据紧迫程度和重要性安排复习顺序
3. **学习策略建议**：针对不同单词特点给出复习方法
4. **时间管理优化**：合理分配复习时间，提高学习效率

## 分析原则：
1. **遗忘临界点优先**：优先复习接近遗忘临界点的单词（可提取性<0.8）
2. **难度加权**：难度高的单词需要更多关注
3. **复习历史考量**：参考历史表现调整计划
4. **时间合理性**：建议的复习时间应符合实际可执行性

## 优先级定义：
- **urgent（紧急）**：必须今天复习，可提取性<0.6 或 已过期的单词
- **high（高）**：建议今天复习，可提取性<0.8 或 稳定性<3天的单词
- **medium（中）**：可以明天复习，正常学习进度的单词
- **low（低）**：可以稍后复习，已掌握且稳定性高的单词

## 输出格式要求：
必须返回标准JSON格式：
{
  "analysis": {
    "summary": "整体学习状况总结（30-50字，包含关键数据和问题）",
    "urgentCount": 紧急需要复习的单词数,
    "suggestedCount": 建议今日复习的单词数
  },
  "reviewPlan": [
    {
      "wordId": 单词ID,
      "word": "单词",
      "priority": "urgent/high/medium/low",
      "reason": "复习原因（15-20字，如：可提取性低，接近遗忘）",
      "suggestedTime": "建议复习时间（如：今天14:00，明天上午）",
      "expectedRetention": 预期记忆保持率0-1,
      "reviewStrategy": "复习策略建议（20-30字，如：先看释义回忆单词，加强拼写）"
    }
  ],
  "recommendations": [
    {
      "type": "timing/method/frequency/break",
      "message": "具体建议内容"
    }
  ],
  "nextReviewReminder": {
    "time": "下次提醒时间",
    "message": "提醒内容"
  }
}

## 注意事项：
- 只返回需要复习的单词（排除已掌握且状态良好的单词）
- reviewPlan最多返回15个最需要复习的单词
- 建议的复习时间应考虑用户偏好
- 给出的建议应具体可执行`;

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

    const userPrompt = `请分析以下单词数据并生成复习计划：

**当前时间**：${context?.currentTime || new Date().toLocaleString('zh-CN')}
**学习目标**：${context?.studyGoal || '高效复习'}
**偏好复习时间**：${context?.preferredTime || '随时'}

**单词列表（共${words.length}个）**：
${JSON.stringify(wordsData, null, 2)}

请直接返回JSON格式的复习计划：`;

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

    const systemPrompt = `你是一个基于认知心理学的记忆专家，精通FSRS（Free Spaced Repetition Scheduler）记忆算法。你的任务是根据用户的复习表现，科学计算新的学习参数。

## FSRS算法核心参数：
- **stability（稳定性）**：记忆持久性，表示记忆能保持多长时间不遗忘
  - 范围：0.1-365 天
  - 新学单词通常从1天开始
  - 每次成功复习后增加，失败则重置或降低

- **difficulty（难度）**：学习难度，反映单词对用户的难易程度
  - 范围：0-1
  - 0表示容易，1表示困难
  - 根据复习表现动态调整

## 得分规则（0-6分制）：
- **0-1分**：完全忘记或错误
  - 稳定性降低50-80%，难度增加，1-3天内必须复习
- **2分**：勉强记得，但不确定
  - 稳定性降低20-30%，难度小幅增加，3-5天内复习
- **3分**：记得但需要思考
  - 稳定性小幅增加（+20-30%），难度不变，按正常间隔复习
- **4分**：记得比较清楚
  - 稳定性增加30-50%，难度降低，间隔延长
- **5-6分**：非常熟悉，快速回忆
  - 稳定性大幅增加（+50-100%），难度降低，间隔大幅延长

## 答题时间影响：
- 快速正确（<5秒）：记忆更牢固，可延长间隔10-20%
- 正常正确（5-15秒）：标准间隔
- 慢速正确（>15秒）：记忆不够牢固，缩短间隔10-20%
- 慢速错误：需要重点复习，间隔大幅缩短

## 连续表现影响：
- 连续3次得分>=4 且 稳定性>14天：视为已掌握
- 最近得分波动大：增加难度，缩短间隔
- 最近得分持续高：降低难度，延长间隔

## 输出格式：
只返回标准JSON格式，不要添加任何额外文字：
{
  "newStability": 新的稳定性（天数，保留1位小数，范围0.1-365）,
  "newDifficulty": 新的难度（保留2位小数，范围0-1）,
  "nextReviewDate": "下次复习日期（ISO格式）",
  "isMastered": 是否已掌握（布尔值）,
  "advice": "学习建议（20-30字，指出问题和改进方向）"
}`;

    const userPrompt = `请根据以下复习表现计算新的学习参数：

**单词信息**：
- 单词：${word}
- 释义：${definition || '未知'}

**复习表现**：
- 本次得分：${score}/6
- 答题时间：${responseTime.toFixed(1)}秒

**历史数据**：
- 之前稳定性：${previousStability.toFixed(1)} 天
- 之前难度：${(previousDifficulty * 100).toFixed(0)}%
- 复习次数：${reviewCount} 次
- 最近得分记录：${recentScores?.join(', ') || '无历史记录'}

**当前时间**：${new Date().toLocaleString('zh-CN')}

请直接返回JSON格式的计算结果：`;

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
    const baseUrl = this.settings.apiBaseUrl || API_BASE_URLS[this.settings.provider];
    const url = `${baseUrl}/chat/completions`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.settings.apiKey}`,
    };

    const body = {
      model: this.settings.model,
      messages: messages,
      temperature: 0.5, // 降低温度，使回答更一致
      max_tokens: 150, // 限制回答长度，防止生成多个版本
      stream: true,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Stream chat error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        
        if (response.status === 401) {
          throw new Error('API 密钥无效或已过期，请检查您的 API 密钥');
        } else if (response.status === 429) {
          throw new Error('API 调用频率超限，请稍后再试');
        } else if (response.status === 402) {
          throw new Error('Token 余额不足，请充值后继续使用');
        }
        throw new Error(`AI 服务错误: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

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
      }
    } catch (error: any) {
      console.error('Stream chat error:', error.message);
      throw error;
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
