import express, { type Request, type Response, type NextFunction } from 'express';
import { initDatabase, getOrCreateUser, getUser, consumeAttempt, createOrder, updateOrderStatus, getUserOrders, PACKAGES, getDatabase, addAttempts } from '../../../client/database/userDao';

// 简单的内存存储（生产环境应该使用 Redis 或数据库）
const userSessions = new Map<string, { userId: number; deviceId: string; createdAt: Date }>();

// 生成设备ID（实际应用中应该从客户端获取）
function generateDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 鉴权中间件
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '未授权访问' });
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
    const session = userSessions.get(token);

    if (!session) {
      return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
    }

    // 将用户信息附加到请求对象
    (req as any).userId = session.userId;
    (req as any).deviceId = session.deviceId;
    (req as any).token = token;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, error: '鉴权失败' });
  }
}

const router = express.Router();

/**
 * 用户注册/登录（基于设备ID）
 * POST /api/v1/user/register
 * Body:
 *   - deviceId: 设备ID（可选，如果不提供则生成新的）
 *   - username: 用户名（可选）
 * Response:
 *   {
 *     success: true,
 *     token: "访问令牌",
 *     user: { ...用户信息 }
 *   }
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { deviceId, username } = req.body;
    
    // 初始化数据库
    await initDatabase();
    
    // 生成或使用提供的设备ID
    const finalDeviceId = deviceId || generateDeviceId();
    
    // 获取或创建用户
    const user = await getOrCreateUser(finalDeviceId);
    
    // 更新用户名（如果提供）
    if (username) {
      await getDatabase().runAsync(
        'UPDATE users SET username = ?, updated_at = datetime(\'now\') WHERE id = ?',
        [username, user.id]
      );
    }
    
    // 生成访问令牌
    const token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    
    // 保存会话
    userSessions.set(token, {
      userId: user.id,
      deviceId: user.device_id,
      createdAt: new Date()
    });
    
    // 返回令牌和用户信息
    const updatedUser = await getUser(user.id);
    
    res.json({
      success: true,
      token,
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '注册失败' 
    });
  }
});

/**
 * 获取用户信息
 * GET /api/v1/user/profile
 * Headers:
 *   - Authorization: Bearer {token}
 * Response:
 *   {
 *     success: true,
 *     user: { ...用户信息 }
 *   }
 */
router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    await initDatabase();
    const userId = (req as any).userId;
    
    const user = await getUser(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '获取用户信息失败' 
    });
  }
});

/**
 * 获取剩余识别次数
 * GET /api/v1/user/attempts
 * Headers:
 *   - Authorization: Bearer {token}
 * Response:
 *   {
 *     success: true,
 *     freeAttempts: 5,
 *     paidAttempts: 95,
 *     totalAttempts: 100,
 *     totalUsed: 10
 *   }
 */
router.get('/attempts', authMiddleware, async (req: Request, res: Response) => {
  try {
    await initDatabase();
    const userId = (req as any).userId;
    
    const user = await getUser(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }
    
    res.json({
      success: true,
      freeAttempts: user.free_attempts,
      paidAttempts: user.paid_attempts,
      totalAttempts: user.free_attempts + user.paid_attempts,
      totalUsed: user.total_used
    });
  } catch (error: any) {
    console.error('Get attempts error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '获取识别次数失败' 
    });
  }
});

/**
 * 获取套餐列表
 * GET /api/v1/user/packages
 * Response:
 *   {
 *     success: true,
 *     packages: [...套餐列表]
 *   }
 */
router.get('/packages', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      packages: PACKAGES
    });
  } catch (error: any) {
    console.error('Get packages error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '获取套餐列表失败' 
    });
  }
});

/**
 * 创建订单
 * POST /api/v1/user/orders
 * Headers:
 *   - Authorization: Bearer {token}
 * Body:
 *   - packageId: 套餐ID
 * Response:
 *   {
 *     success: true,
 *     order: { ...订单信息 }
 *   }
 */
router.post('/orders', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { packageId } = req.body;
    const userId = (req as any).userId;
    
    // 查找套餐
    const packageInfo = PACKAGES.find(p => p.id === packageId);
    if (!packageInfo) {
      return res.status(400).json({ success: false, error: '套餐不存在' });
    }
    
    // 创建订单
    const order = await createOrder(userId, packageId, packageInfo.price, packageInfo.attempts);
    
    res.json({
      success: true,
      order
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '创建订单失败' 
    });
  }
});

/**
 * 模拟支付回调（实际应用中应该对接真实支付系统）
 * POST /api/v1/user/orders/:orderId/pay
 * Headers:
 *   - Authorization: Bearer {token}
 * Body:
 *   - paymentMethod: 支付方式（可选）
 * Response:
 *   {
 *     success: true,
 *     message: "支付成功",
 *     order: { ...订单信息 }
 *   }
 */
router.post('/orders/:orderId/pay', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { paymentMethod } = req.body;
    const userId = (req as any).userId;

    await initDatabase();

    // 获取订单信息
    const order = await getDatabase().getFirstAsync<any>(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [parseInt(orderId as string), userId]
    );
    
    if (!order) {
      return res.status(404).json({ success: false, error: '订单不存在' });
    }
    
    if (order.status === 'paid') {
      return res.status(400).json({ success: false, error: '订单已支付' });
    }
    
    // 模拟支付成功
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    // 更新订单状态
    await updateOrderStatus(order.id, 'paid', transactionId);
    
    // 增加用户识别次数
    await addAttempts(userId, order.attempts);
    
    // 获取更新后的用户信息
    const updatedUser = await getUser(userId);
    
    res.json({
      success: true,
      message: '支付成功',
      order: {
        id: order.id,
        status: 'paid',
        transactionId,
        paidAt: new Date().toISOString()
      },
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Pay order error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '支付失败' 
    });
  }
});

/**
 * 获取用户订单列表
 * GET /api/v1/user/orders
 * Headers:
 *   - Authorization: Bearer {token}
 * Response:
 *   {
 *     success: true,
 *     orders: [...订单列表]
 *   }
 */
router.get('/orders', authMiddleware, async (req: Request, res: Response) => {
  try {
    await initDatabase();
    const userId = (req as any).userId;
    
    const orders = await getUserOrders(userId);
    
    res.json({
      success: true,
      orders
    });
  } catch (error: any) {
    console.error('Get orders error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '获取订单列表失败' 
    });
  }
});

// 导出供其他模块使用的函数
export { consumeAttempt, getUser };

export default router;
