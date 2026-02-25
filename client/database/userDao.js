import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
const DB_NAME = 'word_review.db';
let db = null;
// 初始化数据库
export async function initDatabase() {
    if (db)
        return db;
    db = await SQLite.openDatabaseAsync(DB_NAME);
    // 创建用户表
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL UNIQUE,
      username TEXT,
      free_attempts INTEGER DEFAULT 10,
      paid_attempts INTEGER DEFAULT 0,
      total_used INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
    // 创建订单表
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      package_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      attempts INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT,
      transaction_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
    // 创建使用记录表
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS usage_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      attempts_used INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
    // 创建索引
    await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_records_user_id ON usage_records(user_id);
  `);
    return db;
}
// 获取或创建用户（基于设备ID）
export async function getOrCreateUser(deviceId) {
    if (!db)
        await initDatabase();
    const database = getDatabase();
    try {
        // 尝试获取现有用户
        let user = await database.getFirstAsync('SELECT * FROM users WHERE device_id = ?', [deviceId]);
        if (!user) {
            // 创建新用户
            const result = await database.runAsync('INSERT INTO users (device_id, free_attempts, paid_attempts, total_used) VALUES (?, 10, 0, 0)', [deviceId]);
            user = await database.getFirstAsync('SELECT * FROM users WHERE id = ?', [result.lastInsertRowId]);
        }
        return user;
    }
    catch (error) {
        console.error('Failed to get or create user:', error);
        throw error;
    }
}
// 获取用户信息
export async function getUser(userId) {
    if (!db)
        await initDatabase();
    const database = getDatabase();
    try {
        const user = await database.getFirstAsync('SELECT * FROM users WHERE id = ?', [userId]);
        return user;
    }
    catch (error) {
        console.error('Failed to get user:', error);
        throw error;
    }
}
// 扣减识别次数
export async function consumeAttempt(userId) {
    if (!db)
        await initDatabase();
    const database = getDatabase();
    try {
        // 先获取用户信息
        const user = await getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }
        // 检查是否有剩余次数
        if (user.free_attempts + user.paid_attempts <= 0) {
            return false;
        }
        // 扣减次数
        let updatedAttempts;
        if (user.free_attempts > 0) {
            updatedAttempts = user.free_attempts - 1;
            await database.runAsync('UPDATE users SET free_attempts = ?, total_used = total_used + 1, updated_at = datetime(\'now\') WHERE id = ?', [updatedAttempts, userId]);
        }
        else {
            updatedAttempts = user.paid_attempts - 1;
            await database.runAsync('UPDATE users SET paid_attempts = ?, total_used = total_used + 1, updated_at = datetime(\'now\') WHERE id = ?', [updatedAttempts, userId]);
        }
        // 记录使用日志
        await database.runAsync('INSERT INTO usage_records (user_id, action, attempts_used) VALUES (?, \'ocr_recognize\', 1)', [userId]);
        return true;
    }
    catch (error) {
        console.error('Failed to consume attempt:', error);
        throw error;
    }
}
// 增加识别次数（购买后）
export async function addAttempts(userId, attempts) {
    if (!db)
        await initDatabase();
    const database = getDatabase();
    try {
        await database.runAsync('UPDATE users SET paid_attempts = paid_attempts + ?, updated_at = datetime(\'now\') WHERE id = ?', [attempts, userId]);
    }
    catch (error) {
        console.error('Failed to add attempts:', error);
        throw error;
    }
}
// 创建订单
export async function createOrder(userId, packageId, amount, attempts) {
    if (!db)
        await initDatabase();
    const database = getDatabase();
    try {
        const result = await database.runAsync('INSERT INTO orders (user_id, package_id, amount, attempts, status) VALUES (?, ?, ?, ?, \'pending\')', [userId, packageId, amount, attempts]);
        return {
            orderId: result.lastInsertRowId,
            userId,
            packageId,
            amount,
            attempts,
            status: 'pending'
        };
    }
    catch (error) {
        console.error('Failed to create order:', error);
        throw error;
    }
}
// 更新订单状态（支付成功）
export async function updateOrderStatus(orderId, status, transactionId) {
    if (!db)
        await initDatabase();
    const database = getDatabase();
    try {
        if (status === 'paid') {
            await database.runAsync('UPDATE orders SET status = ?, transaction_id = ?, paid_at = datetime(\'now\') WHERE id = ?', [status, transactionId || '', orderId]);
        }
        else {
            await database.runAsync('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
        }
    }
    catch (error) {
        console.error('Failed to update order status:', error);
        throw error;
    }
}
// 获取用户订单列表
export async function getUserOrders(userId) {
    if (!db)
        await initDatabase();
    const database = getDatabase();
    try {
        const orders = await database.getAllAsync('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        return orders;
    }
    catch (error) {
        console.error('Failed to get user orders:', error);
        throw error;
    }
}
// 获取数据库实例
export function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
}
// 套餐定义
export const PACKAGES = [
    { id: 1, name: '体验包', attempts: 10, price: 1.0, description: '10次识别' },
    { id: 2, name: '基础包', attempts: 100, price: 9.9, description: '100次识别' },
    { id: 3, name: '标准包', attempts: 300, price: 19.9, description: '300次识别' },
    { id: 4, name: '豪华包', attempts: 1000, price: 39.9, description: '1000次识别' },
];
