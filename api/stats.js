/**
 * 统计数据 API
 */

import pg from 'pg';
const { Pool } = pg;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const POSTGRES_URL = process.env.POSTGRES_URL;
    if (!POSTGRES_URL) {
      return res.status(500).json({ error: '数据库未配置' });
    }

    const pool = new Pool({ connectionString: POSTGRES_URL });

    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'used') as used,
        COALESCE(SUM(points) FILTER (WHERE status = 'active'), 0) as total_points
      FROM verification_codes
    `);

    const todayResult = await pool.query(`
      SELECT COUNT(*) as today_used
      FROM usage_logs
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    await pool.end();

    return res.json({
      stats: statsResult.rows[0],
      today: todayResult.rows[0]
    });

  } catch (error) {
    console.error('获取统计失败:', error);
    return res.status(500).json({ error: '获取失败' });
  }
}
