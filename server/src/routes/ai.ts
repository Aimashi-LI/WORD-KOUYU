import { Router, Request, Response } from 'express';
import { AIService, createAIService } from '../services/aiService';
import { storageService } from '../services/storageService';
import { AISettings, AI_MODELS, AIProvider, AIModelConfig } from '../types/ai';

const router = Router();

/**
 * 获取支持的 AI 模型列表
 * GET /api/v1/ai/models
 */
router.get('/models', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: AI_MODELS,
    });
  } catch (error: any) {
    console.error('Get models error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 获取当前 AI 配置
 * GET /api/v1/ai/settings
 */
router.get('/settings', (req: Request, res: Response) => {
  try {
    const aiSettings = storageService.getAISettings();
    
    if (!aiSettings) {
      res.json({
        success: true,
        data: null,
        message: '尚未配置 AI',
      });
      return;
    }

    // 不返回 API 密钥的完整内容，只返回部分
    const maskedSettings = {
      ...aiSettings,
      apiKey: aiSettings.apiKey ? `${aiSettings.apiKey.slice(0, 8)}...${aiSettings.apiKey.slice(-4)}` : '',
    };

    res.json({
      success: true,
      data: maskedSettings,
    });
  } catch (error: any) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 保存 AI 配置
 * POST /api/v1/ai/settings
 * 保存前会先验证 API 密钥，只有验证成功才会激活配置
 */
router.post('/settings', async (req: Request, res: Response) => {
  try {
    const { provider, apiKey, apiBaseUrl, model } = req.body;

    // 验证必填字段
    if (!provider || !apiKey || !model) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段：provider, apiKey, model',
      });
      return;
    }

    // 验证 provider
    if (!['deepseek', 'doubao'].includes(provider)) {
      res.status(400).json({
        success: false,
        error: '不支持的 AI 提供商，仅支持 deepseek 和 doubao',
      });
      return;
    }

    // 验证模型
    const modelConfig = AI_MODELS.find(m => m.id === model);
    if (!modelConfig) {
      res.status(400).json({
        success: false,
        error: '不支持的模型',
      });
      return;
    }

    // 先测试 API 密钥是否有效
    const testSettings: AISettings = {
      provider,
      apiKey,
      apiBaseUrl: apiBaseUrl || undefined,
      model,
      isActive: false, // 测试时先设为 false
    };

    const aiService = createAIService(testSettings);
    const testResult = await aiService.testConnection();

    if (!testResult.isValid) {
      // API 密钥无效，返回错误
      res.status(400).json({
        success: false,
        error: testResult.message || 'API 密钥验证失败',
        testResult,
      });
      return;
    }

    // API 密钥有效，保存配置并标记为已激活
    const aiSettings: AISettings = {
      id: 1,
      provider,
      apiKey,
      apiBaseUrl: apiBaseUrl || undefined,
      model,
      isActive: true, // 测试成功才激活
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storageService.saveAISettings(aiSettings);

    // 不返回完整的 API 密钥
    const maskedSettings = {
      ...aiSettings,
      apiKey: `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`,
    };

    res.json({
      success: true,
      data: maskedSettings,
      message: 'AI 配置保存成功，API 密钥已验证有效',
    });
  } catch (error: any) {
    console.error('Save settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 测试 AI 配置
 * POST /api/v1/ai/test
 * 支持两种模式：
 * 1. 测试新配置：传入 provider, apiKey, model
 * 2. 测试已保存配置：只传入 provider, model（不传apiKey，使用已保存的配置）
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { provider, apiKey, apiBaseUrl, model } = req.body;

    // 如果没有传入 apiKey，尝试使用已保存的配置
    let testSettings: AISettings;
    let usingSavedConfig = false;
    
    if (!apiKey) {
      // 使用已保存的配置测试
      const savedSettings = storageService.getAISettings();
      
      if (!savedSettings) {
        res.status(400).json({
          success: false,
          error: '没有已保存的配置，请输入 API 密钥',
        });
        return;
      }

      usingSavedConfig = true;
      // 使用已保存的配置
      testSettings = {
        ...savedSettings,
        // 如果传入了新的 provider 或 model，使用传入的值
        provider: provider || savedSettings.provider,
        model: model || savedSettings.model,
        apiBaseUrl: apiBaseUrl || savedSettings.apiBaseUrl,
      };
    } else {
      // 验证必填字段
      if (!provider || !model) {
        res.status(400).json({
          success: false,
          error: '缺少必填字段：provider, model',
        });
        return;
      }

      // 创建临时配置进行测试
      testSettings = {
        provider,
        apiKey,
        apiBaseUrl: apiBaseUrl || undefined,
        model,
        isActive: true,
      };
    }

    // 创建 AI 服务实例
    const aiService = createAIService(testSettings);

    // 测试连接
    const result = await aiService.testConnection();

    // 如果使用的是已保存的配置，根据测试结果更新 isActive 状态
    if (usingSavedConfig) {
      const savedSettings = storageService.getAISettings();
      if (savedSettings) {
        savedSettings.isActive = result.isValid;
        savedSettings.updatedAt = new Date().toISOString();
        storageService.saveAISettings(savedSettings);
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Test AI error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 生成助记句子
 * POST /api/v1/ai/generate/mnemonic
 */
router.post('/generate/mnemonic', async (req: Request, res: Response) => {
  try {
    // 获取 AI 配置
    const aiSettings = storageService.getAISettings();
    
    // 检查是否已配置 AI
    if (!aiSettings) {
      res.status(400).json({
        success: false,
        error: '尚未配置 AI，请先在设置中配置 AI API 密钥',
      });
      return;
    }

    const { word, definition, split, phonetic } = req.body;

    // 验证必填字段
    if (!word) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段：word',
      });
      return;
    }

    // 创建 AI 服务实例
    const aiService = createAIService(aiSettings);

    // 生成助记句
    const result = await aiService.generateMnemonic({
      word,
      definition,
      split,
      phonetic,
    });

    // 记录使用情况
    const modelConfig = AI_MODELS.find(m => m.id === aiSettings.model) as AIModelConfig;
    const cost = (result.tokensUsed / 1000) * (modelConfig?.costPer1kTokens || 0);
    
    storageService.recordAIUsage({
      settingId: aiSettings.id!,
      feature: 'mnemonic',
      word,
      tokensUsed: result.tokensUsed,
      cost,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Generate mnemonic error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 生成音标
 * POST /api/v1/ai/generate/phonetic
 */
router.post('/generate/phonetic', async (req: Request, res: Response) => {
  try {
    // 获取 AI 配置
    const aiSettings = storageService.getAISettings();
    
    // 检查是否已配置 AI
    if (!aiSettings) {
      res.status(400).json({
        success: false,
        error: '尚未配置 AI，请先在设置中配置 AI API 密钥',
      });
      return;
    }

    const { word } = req.body;

    // 验证必填字段
    if (!word) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段：word',
      });
      return;
    }

    // 创建 AI 服务实例
    const aiService = createAIService(aiSettings);

    // 生成音标
    const result = await aiService.generatePhonetic({ word });

    // 记录使用情况
    const modelConfig = AI_MODELS.find(m => m.id === aiSettings.model) as AIModelConfig;
    const cost = (result.tokensUsed / 1000) * (modelConfig?.costPer1kTokens || 0);
    
    storageService.recordAIUsage({
      settingId: aiSettings.id!,
      feature: 'phonetic',
      word,
      tokensUsed: result.tokensUsed,
      cost,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Generate phonetic error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 删除 AI 配置
 * DELETE /api/v1/ai/settings
 */
router.delete('/settings', (req: Request, res: Response) => {
  try {
    storageService.deleteAISettings();

    res.json({
      success: true,
      message: 'AI 配置已删除',
    });
  } catch (error: any) {
    console.error('Delete settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 获取 AI 使用统计
 * GET /api/v1/ai/usage
 */
router.get('/usage', (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const stats = storageService.getAIUsageStats(days);
    const recentUsage = storageService.getRecentUsage(10);

    res.json({
      success: true,
      data: {
        ...stats,
        recentUsage,
      },
    });
  } catch (error: any) {
    console.error('Get usage stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 查询 Token 余额
 * GET /api/v1/ai/balance
 */
router.get('/balance', async (req: Request, res: Response) => {
  try {
    // 获取 AI 配置
    const aiSettings = storageService.getAISettings();
    
    if (!aiSettings) {
      res.status(400).json({
        success: false,
        error: '尚未配置 AI',
      });
      return;
    }

    // 创建 AI 服务实例
    const aiService = createAIService(aiSettings);
    
    // 查询余额
    const balance = await aiService.getTokenBalance();

    // 确定警告级别
    let warningLevel: 'normal' | 'low' | 'critical' | 'unsupported' = 'normal';
    if (balance.balance === -1) {
      warningLevel = 'unsupported';
    } else if (balance.balance < 1) {
      warningLevel = 'critical';
    } else if (balance.balance < 5) {
      warningLevel = 'low';
    }

    res.json({
      success: true,
      data: {
        ...balance,
        warningLevel,
        provider: aiSettings.provider,
      },
    });
  } catch (error: any) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 生成复习建议
 * POST /api/v1/ai/generate/review-advice
 */
router.post('/generate/review-advice', async (req: Request, res: Response) => {
  try {
    // 获取 AI 配置
    const aiSettings = storageService.getAISettings();
    
    if (!aiSettings) {
      res.status(400).json({
        success: false,
        error: '尚未配置 AI，请先在设置中配置 AI API 密钥',
      });
      return;
    }

    const { word, definition, stability, difficulty, reviewCount, lastScore, retrievability, daysSinceLastReview } = req.body;

    if (!word) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段：word',
      });
      return;
    }

    // 创建 AI 服务实例
    const aiService = createAIService(aiSettings);

    // 生成复习建议
    const result = await aiService.generateReviewAdvice({
      word,
      definition,
      stability: stability || 1,
      difficulty: difficulty || 0.5,
      reviewCount: reviewCount || 0,
      lastScore,
      retrievability: retrievability || 1,
      daysSinceLastReview,
    });

    // 记录使用情况
    const modelConfig = AI_MODELS.find(m => m.id === aiSettings.model) as AIModelConfig;
    const cost = (result.tokensUsed / 1000) * (modelConfig?.costPer1kTokens || 0);
    
    storageService.recordAIUsage({
      settingId: aiSettings.id!,
      feature: 'review_advice',
      word,
      tokensUsed: result.tokensUsed,
      cost,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Generate review advice error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 一键自动填充单词信息
 * POST /api/v1/ai/generate/auto-fill
 */
router.post('/generate/auto-fill', async (req: Request, res: Response) => {
  try {
    // 获取 AI 配置
    const aiSettings = storageService.getAISettings();
    
    if (!aiSettings) {
      res.status(400).json({
        success: false,
        error: '尚未配置 AI，请先在设置中配置 AI API 密钥',
      });
      return;
    }

    const { word, existingData } = req.body;

    if (!word) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段：word',
      });
      return;
    }

    // 创建 AI 服务实例
    const aiService = createAIService(aiSettings);

    // 一键生成所有信息
    const result = await aiService.generateAutoFill({
      word,
      existingData,
    });

    // 记录使用情况
    const modelConfig = AI_MODELS.find(m => m.id === aiSettings.model) as AIModelConfig;
    const cost = (result.tokensUsed / 1000) * (modelConfig?.costPer1kTokens || 0);
    
    storageService.recordAIUsage({
      settingId: aiSettings.id!,
      feature: 'auto_fill',
      word,
      tokensUsed: result.tokensUsed,
      cost,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Generate auto fill error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * AI 搜索单词
 * POST /api/v1/ai/generate/search-words
 */
router.post('/generate/search-words', async (req: Request, res: Response) => {
  try {
    // 获取 AI 配置
    const aiSettings = storageService.getAISettings();
    
    if (!aiSettings) {
      res.status(400).json({
        success: false,
        error: '尚未配置 AI，请先在设置中配置 AI API 密钥',
      });
      return;
    }

    const { query, count, existingWords } = req.body;

    if (!query) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段：query',
      });
      return;
    }

    // 创建 AI 服务实例
    const aiService = createAIService(aiSettings);

    // 搜索单词
    const result = await aiService.generateSearchWords({
      query,
      count: count || 20,
      existingWords: existingWords || [],
    });

    // 记录使用情况
    const modelConfig = AI_MODELS.find(m => m.id === aiSettings.model) as AIModelConfig;
    const cost = (result.tokensUsed / 1000) * (modelConfig?.costPer1kTokens || 0);
    
    storageService.recordAIUsage({
      settingId: aiSettings.id!,
      feature: 'auto_fill',
      word: query,
      tokensUsed: result.tokensUsed,
      cost,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Generate search words error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * AI 复习分析
 * POST /api/v1/ai/generate/review-analysis
 * 分析所有单词的学习状态，生成个性化复习计划
 */
router.post('/generate/review-analysis', async (req: Request, res: Response) => {
  try {
    // 获取 AI 配置
    const aiSettings = storageService.getAISettings();
    
    if (!aiSettings) {
      res.status(400).json({
        success: false,
        error: '尚未配置 AI，请先在设置中配置 AI API 密钥',
      });
      return;
    }

    const { words, context } = req.body;

    if (!words || !Array.isArray(words)) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段：words（数组）',
      });
      return;
    }

    // 创建 AI 服务实例
    const aiService = createAIService(aiSettings);

    // 分析复习计划
    const result = await aiService.generateReviewAnalysis({
      words,
      context,
    });

    // 记录使用情况
    const modelConfig = AI_MODELS.find(m => m.id === aiSettings.model) as AIModelConfig;
    const cost = (result.tokensUsed / 1000) * (modelConfig?.costPer1kTokens || 0);
    
    storageService.recordAIUsage({
      settingId: aiSettings.id!,
      feature: 'review_advice',
      word: `analysis-${words.length}words`,
      tokensUsed: result.tokensUsed,
      cost,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Generate review analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * AI 复习结果处理
 * POST /api/v1/ai/generate/review-result
 * 根据用户复习表现，AI计算新的学习参数
 */
router.post('/generate/review-result', async (req: Request, res: Response) => {
  try {
    // 获取 AI 配置
    const aiSettings = storageService.getAISettings();
    
    if (!aiSettings) {
      res.status(400).json({
        success: false,
        error: '尚未配置 AI，请先在设置中配置 AI API 密钥',
      });
      return;
    }

    const { word, definition, score, responseTime, previousStability, previousDifficulty, reviewCount, recentScores } = req.body;

    if (!word || score === undefined) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段：word, score',
      });
      return;
    }

    // 创建 AI 服务实例
    const aiService = createAIService(aiSettings);

    // 处理复习结果
    const result = await aiService.generateReviewResult({
      word,
      definition,
      score,
      responseTime: responseTime || 5,
      previousStability: previousStability || 1,
      previousDifficulty: previousDifficulty || 0.5,
      reviewCount: reviewCount || 0,
      recentScores,
    });

    // 记录使用情况
    const modelConfig = AI_MODELS.find(m => m.id === aiSettings.model) as AIModelConfig;
    const cost = (result.tokensUsed / 1000) * (modelConfig?.costPer1kTokens || 0);
    
    storageService.recordAIUsage({
      settingId: aiSettings.id!,
      feature: 'review_advice',
      word,
      tokensUsed: result.tokensUsed,
      cost,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Generate review result error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
