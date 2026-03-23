import express from "express";
import cors from "cors";
import { Router, Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 9091;

// 简单的内存存储
const users = new Map<number, any>();
const orders = new Map<number, any[]>();
let userIdCounter = 1;
let orderIdCounter = 1;

// AI 配置内存存储
interface AISettings {
  id: number;
  provider: 'deepseek' | 'doubao';
  apiKey: string;
  model: string;
  apiBaseUrl?: string;
  isActive: boolean;
}
let aiSettings: AISettings | null = null;
let aiSettingsIdCounter = 1;

// AI 模型配置
const AI_MODELS = {
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek', description: '通用对话模型' },
    { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'deepseek', description: '代码专用模型' },
  ],
  doubao: [
    { id: 'doubao-pro-32k', name: '豆包 Pro 32K', provider: 'doubao', description: '支持32K上下文' },
    { id: 'doubao-pro-128k', name: '豆包 Pro 128K', provider: 'doubao', description: '支持128K上下文' },
  ],
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// ==================== AI 路由 ====================
const aiRouter = Router();

/**
 * 获取支持的 AI 模型列表
 * GET /api/v1/ai/models
 */
aiRouter.get('/models', (req: Request, res: Response) => {
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
aiRouter.get('/settings', (req: Request, res: Response) => {
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
aiRouter.post('/settings', (req: Request, res: Response) => {
  try {
    const { provider, apiKey, model, apiBaseUrl } = req.body;

    if (!provider || !apiKey || !model) {
      res.status(400).json({
        success: false,
        error: '缺少必要参数',
      });
      return;
    }

    aiSettings = {
      id: aiSettingsIdCounter++,
      provider,
      apiKey,
      model,
      apiBaseUrl,
      isActive: true,
    };

    res.json({
      success: true,
      data: {
        id: aiSettings.id,
        provider: aiSettings.provider,
        model: aiSettings.model,
        isActive: aiSettings.isActive,
      },
      message: '配置保存成功',
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
 * 测试 AI 连接
 * POST /api/v1/ai/test
 */
aiRouter.post('/test', async (req: Request, res: Response) => {
  try {
    const { provider, apiKey, model, apiBaseUrl } = req.body;

    if (!provider || !apiKey || !model) {
      res.status(400).json({
        success: false,
        error: '缺少必要参数',
      });
      return;
    }

    // 简单验证 API 密钥格式
    if (provider === 'deepseek' && !apiKey.startsWith('sk-')) {
      res.json({
        success: false,
        error: 'DeepSeek API 密钥格式不正确，应以 sk- 开头',
      });
      return;
    }

    res.json({
      success: true,
      message: '配置验证成功（未实际调用 API）',
    });
  } catch (error: any) {
    console.error('Test connection error:', error);
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
aiRouter.delete('/settings', (req: Request, res: Response) => {
  try {
    aiSettings = null;
    res.json({
      success: true,
      message: '配置已删除',
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
 * 生成助记句
 * POST /api/v1/ai/generate/mnemonic
 */
aiRouter.post('/generate/mnemonic', async (req: Request, res: Response) => {
  try {
    const { word, definition, split, phonetic } = req.body;

    if (!word) {
      res.status(400).json({
        success: false,
        error: '缺少单词参数',
      });
      return;
    }

    if (!aiSettings) {
      res.status(400).json({
        success: false,
        error: '尚未配置 AI',
      });
      return;
    }

    // 这里应该调用实际的 AI API，暂时返回模拟数据
    const mnemonic = `【AI 生成】${word} 的助记句子示例：通过 ${split || '拆分'} 帮助记忆`;

    res.json({
      success: true,
      data: {
        mnemonic,
      },
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
aiRouter.post('/generate/phonetic', async (req: Request, res: Response) => {
  try {
    const { word } = req.body;

    if (!word) {
      res.status(400).json({
        success: false,
        error: '缺少单词参数',
      });
      return;
    }

    if (!aiSettings) {
      res.status(400).json({
        success: false,
        error: '尚未配置 AI',
      });
      return;
    }

    // 这里应该调用实际的 AI API，暂时返回模拟数据
    const phonetic = `/testˈfonetɪk/`;

    res.json({
      success: true,
      data: {
        phonetic,
      },
    });
  } catch (error: any) {
    console.error('Generate phonetic error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 挂载 AI 路由
app.use('/api/v1/ai', aiRouter);
// ==================== AI 路由结束 ====================

// 简单的用户认证（基于设备ID）
function generateDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

app.post('/api/v1/user/register', async (req: any, res: any) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      const newDeviceId = generateDeviceId();
      const userId = userIdCounter++;
      const user = {
        id: userId,
        device_id: newDeviceId,
        free_attempts: 10,
        paid_attempts: 0,
      };
      users.set(userId, user);
      orders.set(userId, []);
      return res.status(200).json({ user, deviceId: newDeviceId });
    }

    // 查找现有用户
    let user: any = null;
    for (const [id, u] of users.entries()) {
      if (u.device_id === deviceId) {
        user = u;
        break;
      }
    }

    if (user) {
      return res.status(200).json({ user });
    } else {
      const userId = userIdCounter++;
      const newUser = {
        id: userId,
        device_id: deviceId,
        free_attempts: 10,
        paid_attempts: 0,
      };
      users.set(userId, newUser);
      orders.set(userId, []);
      return res.status(200).json({ user: newUser });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/v1/user/info', async (req: any, res: any) => {
  try {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    let user: any = null;
    for (const [id, u] of users.entries()) {
      if (u.device_id === deviceId) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 获取用户尝试次数
app.get('/api/v1/user/attempts', async (req: any, res: any) => {
  try {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    let user: any = null;
    for (const [id, u] of users.entries()) {
      if (u.device_id === deviceId) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({
      freeAttempts: user.free_attempts,
      paidAttempts: user.paid_attempts,
      totalAttempts: user.free_attempts + user.paid_attempts,
    });
  } catch (error) {
    console.error('Get attempts error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 创建订单
app.post('/api/v1/user/orders', async (req: any, res: any) => {
  try {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { packageId } = req.body;

    let user: any = null;
    let userId: number = 0;
    for (const [id, u] of users.entries()) {
      if (u.device_id === deviceId) {
        user = u;
        userId = id;
        break;
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const packages: any = {
      'starter': { price: 9.9, attempts: 50 },
      'pro': { price: 29.9, attempts: 200 },
      'unlimited': { price: 99.9, attempts: 1000 },
    };

    const packageInfo = packages[packageId];
    if (!packageInfo) {
      return res.status(400).json({ success: false, error: 'Invalid package' });
    }

    const orderId = orderIdCounter++;
    const order = {
      id: orderId,
      user_id: userId,
      package_id: packageId,
      price: packageInfo.price,
      attempts: packageInfo.attempts,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const userOrders = orders.get(userId) || [];
    userOrders.push(order);
    orders.set(userId, userOrders);

    res.status(200).json({ order });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 获取订单列表
app.get('/api/v1/user/orders', async (req: any, res: any) => {
  try {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    let userId: number = 0;
    for (const [id, u] of users.entries()) {
      if (u.device_id === deviceId) {
        userId = id;
        break;
      }
    }

    if (userId === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userOrders = orders.get(userId) || [];
    res.status(200).json({ orders: userOrders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
