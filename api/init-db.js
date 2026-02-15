/**
 * 数据库初始化 API
 */

const { Pool } = require('pg');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const logs = [];

  try {
    const POSTGRES_URL = process.env.POSTGRES_URL;

    if (!POSTGRES_URL) {
      logs.push('✗ 错误: POSTGRES_URL 环境变量未配置');
      return res.status(500).send(getErrorHtml(logs, 'POSTGRES_URL 环境变量未配置'));
    }

    const pool = new Pool({ connectionString: POSTGRES_URL });

    logs.push('正在检查数据库连接...');
    const testResult = await pool.query('SELECT NOW() as now');
    logs.push(`✓ 数据库连接成功 (${testResult.rows[0].now})`);

    const tables = [
      `CREATE TABLE IF NOT EXISTS verification_codes (
        code VARCHAR(50) PRIMARY KEY,
        points INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        used_at TIMESTAMP WITH TIME ZONE,
        device_info TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS user_credits (
        device_id VARCHAR(100) PRIMARY KEY,
        credits INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS usage_logs (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        points INTEGER NOT NULL,
        device_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (code) REFERENCES verification_codes(code) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS system_meta (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`
    ];

    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i].match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
      logs.push(`正在创建 ${tableName} 表...`);
      await pool.query(tables[i]);
      logs.push(`✓ ${tableName} 表已创建`);
    }

    logs.push('正在初始化系统版本...');
    await pool.query(
      `INSERT INTO system_meta (key, value) VALUES ('version', NOW()::TEXT)
       ON CONFLICT (key) DO NOTHING`
    );
    logs.push('✓ 系统版本已初始化');

    logs.push('正在创建索引...');
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_verification_codes_status ON verification_codes(status)'
    );
    logs.push('✓ 索引已创建');

    const statsResult = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'used') as used
       FROM verification_codes`
    );

    const stats = statsResult.rows[0];

    logs.push('');
    logs.push('=== 数据库统计 ===');
    logs.push(`总验证码数: ${stats.total}`);
    logs.push(`可用验证码: ${stats.active}`);
    logs.push(`已使用: ${stats.used}`);

    await pool.end();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(getSuccessHtml(logs, stats));

  } catch (error) {
    logs.push(`✗ 错误: ${error.message}`);
    console.error('Database init error:', error);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).send(getErrorHtml(logs, error.message));
  }
};

function getSuccessHtml(logs, stats) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>数据库初始化完成</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f7; }
    .success { color: #10b981; }
    .log { font-family: monospace; background: #f3f4f6; padding: 10px; border-radius: 8px; margin: 10px 0; }
    .stats { background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .btn { display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin: 5px; }
  </style>
</head>
<body>
  <h1 class="success">✓ 数据库初始化完成</h1>
  <div class="log">${logs.map(l => `<div>${l}</div>`).join('')}</div>
  <div class="stats">
    <h3>📊 当前状态</h3>
    <p>总验证码数: <strong>${stats.total}</strong></p>
    <p>可用验证码: <strong>${stats.active}</strong></p>
    <p>已使用: <strong>${stats.used}</strong></p>
  </div>
  <h3>下一步</h3>
  <a href="/" class="btn">返回首页</a>
</body>
</html>`;
}

function getErrorHtml(logs, errorMessage) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>初始化失败</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    .error { color: #ef4444; }
    .log { font-family: monospace; background: #fef2f2; padding: 10px; border-radius: 8px; }
  </style>
</head>
<body>
  <h1 class="error">✗ 数据库初始化失败</h1>
  <div class="log">${logs.map(l => `<div>${l}</div>`).join('')}</div>
  <p><strong>错误详情:</strong> ${errorMessage}</p>
  <p>请检查环境变量 POSTGRES_URL 是否正确配置。</p>
</body>
</html>`;
}
