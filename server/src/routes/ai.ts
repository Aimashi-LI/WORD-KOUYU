import { Router, Request, Response } from 'express';
import { AIService, createAIService } from '../services/aiService';
import { AISettings, AI_MODELS, AIProvider } from '../types/ai';

const router = Router();

// 临时存储 AI 配置（实际应该存储在数据库中）
// 这里使用内存存储，重启后会丢失
let aiSettings: AISettings | null = null;

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
 */
router.post('/settings', (req: Request, res: Response) => {
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

    // 保存配置
    aiSettings = {
      id: 1,
      provider,
      apiKey,
      apiBaseUrl: apiBaseUrl || undefined,
      model,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 不返回完整的 API 密钥
    const maskedSettings = {
      ...aiSettings,
      apiKey: `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`,
    };

    res.json({
      success: true,
      data: maskedSettings,
      message: 'AI 配置保存成功',
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
 */
router.post('/test', async (req: Request, res: Response) => {
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

    // 创建临时配置进行测试
    const testSettings: AISettings = {
      provider,
      apiKey,
      apiBaseUrl: apiBaseUrl || undefined,
      model,
      isActive: true,
    };

    // 创建 AI 服务实例
    const aiService = createAIService(testSettings);

    // 测试连接
    const result = await aiService.testConnection();

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
    aiSettings = null;

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

export default router;
