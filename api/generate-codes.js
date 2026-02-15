/**
 * 生成验证码 API
 */

import pg from 'pg';
const { Pool } = pg;

// 生成随机验证码
function generateCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { points = 1, amount = 1, codeLength = 8 } = body;

    if (amount < 1 || amount > 1000) {
      return Response.json({ error: '生成数量必须在 1-1000 之间' }, { status: 400 });
    }

    const POSTGRES_URL = process.env.POSTGRES_URL;
    if (!POSTGRES_URL) {
      return Response.json({ error: '数据库未配置' }, { status: 500 });
    }

    const pool = new Pool({ connectionString: POSTGRES_URL });
    const generatedCodes = [];

    try {
      await pool.query('BEGIN');

      for (let i = 0; i < amount; i++) {
        let code;
        let exists = true;
        let attempts = 0;

        // 生成唯一验证码
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

      return Response.json({
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
    return Response.json({ error: '生成失败，请稍后重试' }, { status: 500 });
  }
}

// 获取验证码列表
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const POSTGRES_URL = process.env.POSTGRES_URL;
    if (!POSTGRES_URL) {
      return Response.json({ error: '数据库未配置' }, { status: 500 });
    }

    const pool = new Pool({ connectionString: POSTGRES_URL });

    let query = 'SELECT * FROM verification_codes';
    const params = [];

    if (status !== 'all') {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    await pool.end();

    return Response.json({
      codes: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('获取列表失败:', error);
    return Response.json({ error: '获取失败' }, { status: 500 });
  }
}
