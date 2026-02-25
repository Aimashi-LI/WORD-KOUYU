import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;

// 数据库连接池
let pool: pkg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

// 初始化数据库连接
export async function getDatabase() {
  if (db && pool) {
    return { pool, db };
  }

  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'word_review',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  db = drizzle(pool);

  // 测试连接
  try {
    const client = await pool.connect();
    client.release();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }

  return { pool, db };
}

// 关闭数据库连接
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}
