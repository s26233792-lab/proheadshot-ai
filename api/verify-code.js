/**
 * 验证码验证 API
 */

import pg from 'pg';
const { Pool } = pg;

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, deviceId } = body;

    if (!code) {
      return Response.json({ error: '请输入验证码' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const POSTGRES_URL = process.env.POSTGRES_URL;

    if (!POSTGRES_URL) {
      return Response.json({ error: '数据库未配置' }, { status: 500 });
    }

    const pool = new Pool({ connectionString: POSTGRES_URL });

    try {
      // 开始事务
      await pool.query('BEGIN');

      // 查询验证码状态（加锁）
      const result = await pool.query(
        'SELECT points, status FROM verification_codes WHERE code = $1 FOR UPDATE',
        [cleanCode]
      );

      if (result.rows.length === 0) {
        await pool.query('ROLLBACK');
        await pool.end();
        return Response.json({ error: '验证码不存在' }, { status: 404 });
      }

      const codeData = result.rows[0];

      if (codeData.status !== 'active') {
        await pool.query('ROLLBACK');
        await pool.end();
        return Response.json({ error: '验证码已使用' }, { status: 400 });
      }

      const points = codeData.points;

      // 更新验证码状态
      await pool.query(
        'UPDATE verification_codes SET status = $1, used_at = NOW() WHERE code = $2',
        ['used', cleanCode]
      );

      // 记录使用日志
      await pool.query(
        'INSERT INTO usage_logs (code, points, device_id) VALUES ($1, $2, $3)',
        [cleanCode, points, deviceId || null]
      );

      // 更新用户积分
      if (deviceId) {
        await pool.query(
          `INSERT INTO user_credits (device_id, credits) VALUES ($1, $2)
           ON CONFLICT (device_id) DO UPDATE SET credits = user_credits.credits + $2, updated_at = NOW()`,
          [deviceId, points]
        );
      }

      await pool.query('COMMIT');
      await pool.end();

      return Response.json({
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
    return Response.json({ error: '验证失败，请稍后重试' }, { status: 500 });
  }
}

// 查询验证码状态
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return Response.json({ error: '请提供验证码' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const POSTGRES_URL = process.env.POSTGRES_URL;

    if (!POSTGRES_URL) {
      return Response.json({ error: '数据库未配置' }, { status: 500 });
    }

    const pool = new Pool({ connectionString: POSTGRES_URL });

    const result = await pool.query(
      'SELECT status, points, created_at FROM verification_codes WHERE code = $1',
      [cleanCode]
    );

    await pool.end();

    if (result.rows.length === 0) {
      return Response.json({ exists: false }, { status: 404 });
    }

    return Response.json({
      exists: true,
      status: result.rows[0].status,
      points: result.rows[0].points
    });

  } catch (error) {
    console.error('查询失败:', error);
    return Response.json({ error: '查询失败' }, { status: 500 });
  }
}
