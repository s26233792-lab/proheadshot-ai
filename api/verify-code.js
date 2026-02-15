/**
 * 验证码验证 API
 */

import pg from 'pg';
const { Pool } = pg;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { code, deviceId } = req.body;

      if (!code) {
        return res.status(400).json({ error: '请输入验证码' });
      }

      const cleanCode = code.trim().toUpperCase();
      const POSTGRES_URL = process.env.POSTGRES_URL;

      if (!POSTGRES_URL) {
        return res.status(500).json({ error: '数据库未配置' });
      }

      const pool = new Pool({ connectionString: POSTGRES_URL });

      try {
        await pool.query('BEGIN');

        const result = await pool.query(
          'SELECT points, status FROM verification_codes WHERE code = $1 FOR UPDATE',
          [cleanCode]
        );

        if (result.rows.length === 0) {
          await pool.query('ROLLBACK');
          await pool.end();
          return res.status(404).json({ error: '验证码不存在' });
        }

        const codeData = result.rows[0];

        if (codeData.status !== 'active') {
          await pool.query('ROLLBACK');
          await pool.end();
          return res.status(400).json({ error: '验证码已使用' });
        }

        const points = codeData.points;

        await pool.query(
          'UPDATE verification_codes SET status = $1, used_at = NOW() WHERE code = $2',
          ['used', cleanCode]
        );

        await pool.query(
          'INSERT INTO usage_logs (code, points, device_id) VALUES ($1, $2, $3)',
          [cleanCode, points, deviceId || null]
        );

        if (deviceId) {
          await pool.query(
            `INSERT INTO user_credits (device_id, credits) VALUES ($1, $2)
             ON CONFLICT (device_id) DO UPDATE SET credits = user_credits.credits + $2, updated_at = NOW()`,
            [deviceId, points]
          );
        }

        await pool.query('COMMIT');
        await pool.end();

        return res.json({
          success: true,
          points,
          message: `验证成功，+${points} 点数`
        });

      } catch (error) {
        await pool.query('ROLLBACK');
        await pool.end();
        throw error;
      }

    } catch (error) {
      console.error('验证失败:', error);
      return res.status(500).json({ error: '验证失败，请稍后重试' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({ error: '请提供验证码' });
      }

      const cleanCode = code.trim().toUpperCase();
      const POSTGRES_URL = process.env.POSTGRES_URL;

      if (!POSTGRES_URL) {
        return res.status(500).json({ error: '数据库未配置' });
      }

      const pool = new Pool({ connectionString: POSTGRES_URL });

      const result = await pool.query(
        'SELECT status, points, created_at FROM verification_codes WHERE code = $1',
        [cleanCode]
      );

      await pool.end();

      if (result.rows.length === 0) {
        return res.status(404).json({ exists: false });
      }

      return res.json({
        exists: true,
        status: result.rows[0].status,
        points: result.rows[0].points
      });

    } catch (error) {
      console.error('查询失败:', error);
      return res.status(500).json({ error: '查询失败' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
