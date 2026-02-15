/**
 * 生成验证码 API
 */

import pg from 'pg';
const { Pool } = pg;

function generateCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { points = 1, amount = 1, codeLength = 8 } = req.body;

      if (amount < 1 || amount > 1000) {
        return res.status(400).json({ error: '生成数量必须在 1-1000 之间' });
      }

      const POSTGRES_URL = process.env.POSTGRES_URL;
      if (!POSTGRES_URL) {
        return res.status(500).json({ error: '数据库未配置' });
      }

      const pool = new Pool({ connectionString: POSTGRES_URL });
      const generatedCodes = [];

      try {
        await pool.query('BEGIN');

        for (let i = 0; i < amount; i++) {
          let code;
          let exists = true;
          let attempts = 0;

          while (exists && attempts < 100) {
            code = generateCode(codeLength);
            const checkResult = await pool.query(
              'SELECT 1 FROM verification_codes WHERE code = $1',
              [code]
            );
            exists = checkResult.rows.length > 0;
            attempts++;
          }

          await pool.query(
            'INSERT INTO verification_codes (code, points, status) VALUES ($1, $2, $3)',
            [code, points, 'active']
          );

          generatedCodes.push({ code, points, status: 'active' });
        }

        await pool.query('COMMIT');
        await pool.end();

        return res.json({
          success: true,
          codes: generatedCodes,
          count: generatedCodes.length,
          message: `已生成 ${generatedCodes.length} 张验证码`
        });

      } catch (error) {
        await pool.query('ROLLBACK');
        await pool.end();
        throw error;
      }

    } catch (error) {
      console.error('生成失败:', error);
      return res.status(500).json({ error: '生成失败，请稍后重试' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { status = 'all', limit = 100, offset = 0 } = req.query;

      const POSTGRES_URL = process.env.POSTGRES_URL;
      if (!POSTGRES_URL) {
        return res.status(500).json({ error: '数据库未配置' });
      }

      const pool = new Pool({ connectionString: POSTGRES_URL });

      let query = 'SELECT * FROM verification_codes';
      const params = [];

      if (status !== 'all') {
        query += ' WHERE status = $1';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(parseInt(limit), parseInt(offset));

      const result = await pool.query(query, params);
      await pool.end();

      return res.json({
        codes: result.rows,
        count: result.rows.length
      });

    } catch (error) {
      console.error('获取列表失败:', error);
      return res.status(500).json({ error: '获取失败' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
