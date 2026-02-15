/**
 * 用户积分 API
 */

const { Pool } = require('pg');

function getDeviceId(req) {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.headers['x-forwarded-for'] ||
            req.headers['x-real-ip'] ||
            'unknown';

  const str = userAgent + ip;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const deviceId = getDeviceId(req);
      const POSTGRES_URL = process.env.POSTGRES_URL;

      if (!POSTGRES_URL) {
        return res.status(500).json({ error: '数据库未配置' });
      }

      const pool = new Pool({ connectionString: POSTGRES_URL });

      const result = await pool.query(
        'SELECT credits FROM user_credits WHERE device_id = $1',
        [deviceId]
      );

      await pool.end();

      const credits = result.rows.length > 0 ? result.rows[0].credits : 0;

      return res.json({
        deviceId,
        credits
      });

    } catch (error) {
      console.error('获取积分失败:', error);
      return res.status(500).json({ error: '获取失败' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { amount = 1 } = req.body;
      const deviceId = getDeviceId(req);

      if (amount < 1) {
        return res.status(400).json({ error: '消费数量必须大于0' });
      }

      const POSTGRES_URL = process.env.POSTGRES_URL;
      if (!POSTGRES_URL) {
        return res.status(500).json({ error: '数据库未配置' });
      }

      const pool = new Pool({ connectionString: POSTGRES_URL });

      try {
        await pool.query('BEGIN');

        const checkResult = await pool.query(
          'SELECT credits FROM user_credits WHERE device_id = $1 FOR UPDATE',
          [deviceId]
        );

        if (checkResult.rows.length === 0 || checkResult.rows[0].credits < amount) {
          await pool.query('ROLLBACK');
          await pool.end();
          return res.status(400).json({ error: '积分不足' });
        }

        await pool.query(
          'UPDATE user_credits SET credits = credits - $1, updated_at = NOW() WHERE device_id = $2',
          [amount, deviceId]
        );

        await pool.query('COMMIT');

        const newCredits = checkResult.rows[0].credits - amount;

        await pool.end();

        return res.json({
          success: true,
          deducted: amount,
          remaining: newCredits
        });

      } catch (error) {
        await pool.query('ROLLBACK');
        await pool.end();
        throw error;
      }

    } catch (error) {
      console.error('消费积分失败:', error);
      return res.status(500).json({ error: '消费失败' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
