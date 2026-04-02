import express from "express";
import cors from "cors";
import { Router, Request, Response } from 'express';
import aiRouter from './routes/ai';
import audioRouter from './routes/audio';
import speakingRouter from './routes/speaking';

const app = express();
const port = process.env.PORT || 9091;

// 简单的内存存储
const users = new Map<number, any>();
const orders = new Map<number, any[]>();
let userIdCounter = 1;
let orderIdCounter = 1;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// ==================== 挂载 AI 路由 ====================
app.use('/api/v1/ai', aiRouter);
// ==================== AI 路由结束 ====================

// ==================== 挂载音频路由 ====================
app.use('/api/v1/audio', audioRouter);
// ==================== 音频路由结束 ====================

// ==================== 挂载口语训练路由 ====================
app.use('/api/v1/speaking', speakingRouter);
// ==================== 口语训练路由结束 ====================

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
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

app.get('/api/v1/user/info', async (req: any, res: any) => {
  try {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
      return res.status(401).json({ success: false, error: '未授权访问' });
    }

    let user: any = null;
    for (const [id, u] of users.entries()) {
      if (u.device_id === deviceId) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 获取用户尝试次数
app.get('/api/v1/user/attempts', async (req: any, res: any) => {
  try {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
      return res.status(401).json({ success: false, error: '未授权访问' });
    }

    let user: any = null;
    for (const [id, u] of users.entries()) {
      if (u.device_id === deviceId) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    res.status(200).json({
      freeAttempts: user.free_attempts,
      paidAttempts: user.paid_attempts,
      totalAttempts: user.free_attempts + user.paid_attempts,
    });
  } catch (error) {
    console.error('Get attempts error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 创建订单
app.post('/api/v1/user/orders', async (req: any, res: any) => {
  try {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
      return res.status(401).json({ success: false, error: '未授权访问' });
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
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const packages: any = {
      'starter': { price: 9.9, attempts: 50 },
      'pro': { price: 29.9, attempts: 200 },
      'unlimited': { price: 99.9, attempts: 1000 },
    };

    const packageInfo = packages[packageId];
    if (!packageInfo) {
      return res.status(400).json({ success: false, error: '无效的套餐' });
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
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 获取订单列表
app.get('/api/v1/user/orders', async (req: any, res: any) => {
  try {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
      return res.status(401).json({ success: false, error: '未授权访问' });
    }

    let userId: number = 0;
    for (const [id, u] of users.entries()) {
      if (u.device_id === deviceId) {
        userId = id;
        break;
      }
    }

    if (userId === 0) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const userOrders = orders.get(userId) || [];
    res.status(200).json({ orders: userOrders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
