/**
 * 统计数据 API
 */

import pg from 'pg';
const { Pool } = pg;

export async function GET(request) {
  try {
    const POSTGRES_URL = process.env.POSTGRES_URL;
    if (!POSTGRES_URL) {
      return Response.json({ error: '数据库未配置' }, { status: 500 });
    }

    const pool = new Pool({ connectionString: POSTGRES_URL });

    // 基本统计
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'used') as used,
        COALESCE(SUM(points) FILTER (WHERE status = 'active'), 0) as total_points
      FROM verification_codes
    `);

    // 今日使用统计
    const todayResult = await pool.query(`
      SELECT COUNT(*) as today_used
      FROM usage_logs
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    await pool.end();

    return Response.json({
      stats: statsResult.rows[0],
      today: todayResult.rows[0]
    });

  } catch (error) {
    console.error('获取统计失败:', error);
    return Response.json({ error: '获取失败' }, { status: 500 });
  }
}
