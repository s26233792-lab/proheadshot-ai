import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * 数据库初始化 API
 * 首次部署后访问 /api/init-db 初始化数据库表
 */
export async function GET(request: NextRequest) {
  const logs = [];
  let hasError = false;

  try {
    // 检查数据库连接
    logs.push('正在检查数据库连接...');
    const testResult = await sql`SELECT NOW()`;
    logs.push(`✓ 数据库连接成功 (${testResult.rows[0].now})`);

    // 创建验证码表
    logs.push('正在创建 verification_codes 表...');
    await sql`
      CREATE TABLE IF NOT EXISTS verification_codes (
        code VARCHAR(50) PRIMARY KEY,
        points INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        used_at TIMESTAMP WITH TIME ZONE,
        device_info TEXT
      )
    `;
    logs.push('✓ verification_codes 表已创建');

    // 创建用户积分表
    logs.push('正在创建 user_credits 表...');
    await sql`
      CREATE TABLE IF NOT EXISTS user_credits (
        device_id VARCHAR(100) PRIMARY KEY,
        credits INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    logs.push('✓ user_credits 表已创建');

    // 创建使用记录表
    logs.push('正在创建 usage_logs 表...');
    await sql`
      CREATE TABLE IF NOT EXISTS usage_logs (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        points INTEGER NOT NULL,
        device_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (code) REFERENCES verification_codes(code) ON DELETE CASCADE
      )
    `;
    logs.push('✓ usage_logs 表已创建');

    // 创建元数据表
    logs.push('正在创建 system_meta 表...');
    await sql`
      CREATE TABLE IF NOT EXISTS system_meta (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    logs.push('✓ system_meta 表已创建');

    // 初始化版本号
    await sql`
      INSERT INTO system_meta (key, value) VALUES ('version', NOW()::TEXT)
      ON CONFLICT (key) DO NOTHING
    `;
    logs.push('✓ 系统版本已初始化');

    // 创建索引
    await sql`
      CREATE INDEX IF NOT EXISTS idx_verification_codes_status ON verification_codes(status)
    `;
    logs.push('✓ 索引已创建');

    // 获取统计信息
    const stats = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'used') as used
      FROM verification_codes
    `;

    logs.push('');
    logs.push('=== 数据库统计 ===');
    logs.push(`总验证码数: ${stats.rows[0].total}`);
    logs.push(`可用验证码: ${stats.rows[0].active}`);
    logs.push(`已使用: ${stats.rows[0].used}`);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>数据库初始化完成</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    .success { color: #10b981; }
    .error { color: #ef4444; }
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
    <p>总验证码数: <strong>${stats.rows[0].total}</strong></p>
    <p>可用验证码: <strong>${stats.rows[0].active}</strong></p>
    <p>已使用: <strong>${stats.rows[0].used}</strong></p>
  </div>
  <h3>下一步</h3>
  <a href="/" class="btn">返回首页</a>
  <a href="/api/stats" class="btn">查看统计 API</a>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (error) {
    hasError = true;
    logs.push(`✗ 错误: ${error.message}`);

    const errorHtml = `
<!DOCTYPE html>
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
  <p><strong>错误详情:</strong> ${error.message}</p>
  <p>请检查：</p>
  <ul>
    <li>Vercel 项目是否已链接 Postgres 数据库</li>
    <li>环境变量 POSTGRES_URL 是否正确配置</li>
    <li>数据库是否有足够的权限</li>
  </ul>
</body>
</html>
    `;

    return new NextResponse(errorHtml, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}
