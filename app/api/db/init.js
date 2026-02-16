/**
 * 数据库初始化和迁移脚本
 * 用于首次设置数据库或从旧系统迁移数据
 */

import { sql } from '@vercel/postgres';

// 初始化数据库表
export async function initDatabase() {
  console.log('开始初始化数据库...');

  try {
    // 创建验证码表
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
    console.log('✓ verification_codes 表已创建');

    // 创建用户积分表
    await sql`
      CREATE TABLE IF NOT EXISTS user_credits (
        device_id VARCHAR(100) PRIMARY KEY,
        credits INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✓ user_credits 表已创建');

    // 创建使用记录表
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
    console.log('✓ usage_logs 表已创建');

    // 创建元数据表
    await sql`
      CREATE TABLE IF NOT EXISTS system_meta (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✓ system_meta 表已创建');

    // 初始化版本号
    await sql`
      INSERT INTO system_meta (key, value) VALUES ('version', NOW()::TEXT)
      ON CONFLICT (key) DO NOTHING
    `;
    console.log('✓ 系统版本已初始化');

    // 创建索引
    await sql`
      CREATE INDEX IF NOT EXISTS idx_verification_codes_status ON verification_codes(status)
    `;
    console.log('✓ 索引已创建');

    console.log('数据库初始化完成！');
    return { success: true };

  } catch (error) {
    console.error('数据库初始化失败:', error);
    return { success: false, error: error.message };
  }
}

// 从旧的 codes.json 格式导入数据
export async function importFromGitHubFormat(codesData) {
  console.log('开始导入验证码数据...');

  try {
    await sql`BEGIN`;

    let imported = 0;
    let skipped = 0;

    for (const [code, data] of Object.entries(codesData)) {
      // 跳过元数据
      if (code.startsWith('_')) continue;

      const cleanCode = code.trim().toUpperCase();
      const codeData = typeof data === 'object' ? data : { points: data };

      try {
        await sql`
          INSERT INTO verification_codes (code, points, status, created_at)
          VALUES (${cleanCode}, ${codeData.points || 1}, ${codeData.status || 'active'}, ${codeData.createdAt || new Date().toISOString()})
          ON CONFLICT (code) DO NOTHING
        `;
        imported++;
      } catch (e) {
        skipped++;
      }
    }

    // 更新版本号
    await sql`
      INSERT INTO system_meta (key, value, updated_at)
      VALUES ('version', NOW()::TEXT, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = NOW()::TEXT, updated_at = NOW()
    `;

    await sql`COMMIT`;

    console.log(`导入完成：${imported} 条成功，${skipped} 条跳过`);
    return { success: true, imported, skipped };

  } catch (error) {
    await sql`ROLLBACK`;
    console.error('导入失败:', error);
    return { success: false, error: error.message };
  }
}

// 获取数据库统计信息
export async function getDatabaseStats() {
  try {
    const stats = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'used') as used
      FROM verification_codes
    `;

    return stats.rows[0];
  } catch (error) {
    console.error('获取统计失败:', error);
    return null;
  }
}

// 清空数据库（谨慎使用）
export async function clearDatabase() {
  try {
    await sql`BEGIN`;

    await sql`DELETE FROM usage_logs`;
    await sql`DELETE FROM user_credits`;
    await sql`DELETE FROM verification_codes`;
    await sql`DELETE FROM system_meta`;

    await sql`COMMIT`;

    console.log('数据库已清空');
    return { success: true };
  } catch (error) {
    await sql`ROLLBACK`;
    console.error('清空数据库失败:', error);
    return { success: false, error: error.message };
  }
}
