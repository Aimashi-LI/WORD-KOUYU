import { getDatabase } from './index';

// 数据库表定义（简化版本）
interface User {
  id: number;
  deviceId: string;
  username: string | null;
  freeAttempts: number;
  paidAttempts: number;
  totalUsed: number;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: number;
  userId: number;
  packageId: number;
  amount: number;
  attempts: number;
  status: string;
  paymentMethod: string | null;
  transactionId: string | null;
  createdAt: string;
  paidAt: string | null;
}

interface UsageRecord {
  id: number;
  userId: number;
  action: string;
  attemptsUsed: number;
  createdAt: string;
}

// 套餐配置
export const PACKAGES = {
  BASIC: { id: 1, name: '基础版', attempts: 100, price: 9.9 },
  STANDARD: { id: 2, name: '标准版', attempts: 500, price: 29.9 },
  PREMIUM: { id: 3, name: '高级版', attempts: 1000, price: 49.9 },
};

// 初始化数据库表
export async function initDatabase() {
  const { pool } = await getDatabase();
  const client = await pool.connect();

  try {
    // 创建用户表
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        device_id TEXT NOT NULL UNIQUE,
        username TEXT,
        free_attempts INTEGER DEFAULT 10,
        paid_attempts INTEGER DEFAULT 0,
        total_used INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建订单表
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        package_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        attempts INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        payment_method TEXT,
        transaction_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 创建使用记录表
    await client.query(`
      CREATE TABLE IF NOT EXISTS usage_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        attempts_used INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('Database tables initialized');
  } finally {
    client.release();
  }
}

// 获取或创建用户
export async function getOrCreateUser(deviceId: string): Promise<User> {
  const { pool } = await getDatabase();
  const client = await pool.connect();

  try {
    // 尝试获取用户
    const result = await client.query(
      'SELECT * FROM users WHERE device_id = $1',
      [deviceId]
    );

    if (result.rows.length > 0) {
      return result.rows[0] as User;
    }

    // 创建新用户
    const newUser = await client.query(
      `INSERT INTO users (device_id, free_attempts, paid_attempts, total_used)
       VALUES ($1, 10, 0, 0)
       RETURNING *`,
      [deviceId]
    );

    return newUser.rows[0] as User;
  } finally {
    client.release();
  }
}

// 更新用户名
export async function updateUser(userId: number, username: string): Promise<User> {
  const { pool } = await getDatabase();
  const client = await pool.connect();

  try {
    const result = await client.query(
      `UPDATE users
       SET username = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [username, userId]
    );

    return result.rows[0] as User;
  } finally {
    client.release();
  }
}

// 获取用户信息
export async function getUser(userId: number): Promise<User | null> {
  const { pool } = await getDatabase();
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    return result.rows.length > 0 ? (result.rows[0] as User) : null;
  } finally {
    client.release();
  }
}

// 消耗尝试次数
export async function consumeAttempt(userId: number, attempts: number = 1): Promise<User> {
  const { pool } = await getDatabase();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 检查用户余额
    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0] as User;

    const totalAttempts = user.freeAttempts + user.paidAttempts - user.totalUsed;
    if (totalAttempts < attempts) {
      await client.query('ROLLBACK');
      throw new Error('尝试次数不足');
    }

    // 更新用户数据
    const updatedUser = await client.query(
      `UPDATE users
       SET total_used = total_used + $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [attempts, userId]
    );

    // 记录使用
    await client.query(
      `INSERT INTO usage_records (user_id, action, attempts_used)
       VALUES ($1, 'api_call', $2)`,
      [userId, attempts]
    );

    await client.query('COMMIT');

    return updatedUser.rows[0] as User;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// 获取订单信息
export async function getOrder(orderId: number): Promise<Order | null> {
  const { pool } = await getDatabase();
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );

    return result.rows.length > 0 ? (result.rows[0] as Order) : null;
  } finally {
    client.release();
  }
}

// 创建订单
export async function createOrder(userId: number, packageId: number): Promise<Order> {
  const { pool } = await getDatabase();
  const client = await pool.connect();

  try {
    const pkg = Object.values(PACKAGES).find(p => p.id === packageId);
    if (!pkg) {
      throw new Error('无效的套餐');
    }

    const order = await client.query(
      `INSERT INTO orders (user_id, package_id, amount, attempts, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [userId, packageId, pkg.price, pkg.attempts]
    );

    return order.rows[0] as Order;
  } finally {
    client.release();
  }
}

// 更新订单状态
export async function updateOrderStatus(
  orderId: number,
  status: 'pending' | 'paid' | 'failed',
  transactionId?: string
): Promise<Order> {
  const { pool } = await getDatabase();
  const client = await pool.connect();

  try {
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );
    const order = orderResult.rows[0] as Order;

    await client.query('BEGIN');

    // 更新订单状态
    await client.query(
      `UPDATE orders
       SET status = $1, transaction_id = $2, paid_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [status, transactionId || null, orderId]
    );

    // 如果订单支付成功，增加用户尝试次数
    if (status === 'paid') {
      await client.query(
        `UPDATE users
         SET paid_attempts = paid_attempts + $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [order.attempts, order.userId]
      );
    }

    await client.query('COMMIT');

    const updatedOrder = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );

    return updatedOrder.rows[0] as Order;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// 获取用户订单列表
export async function getUserOrders(userId: number): Promise<Order[]> {
  const { pool } = await getDatabase();
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows as Order[];
  } finally {
    client.release();
  }
}
